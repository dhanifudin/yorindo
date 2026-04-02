import type { FastifyPluginAsync, FastifyReply } from 'fastify'
import { z } from 'zod'
import {
  auditLogRepository,
  contactRepository,
  eventRepository,
  queueService,
  registrationRepository,
  surveyRepository,
  userRepository,
  yoriMindService,
} from '../container.js'
import { requireAdmin, requireAuth, requireRoles, type JwtPayload } from '../middleware/auth.js'
import type { Event, Registration } from '../types/domain.js'
import { validateOpenApiRequest, validateOpenApiResponse } from '../lib/openapi-contract.js'
import { INDONESIAN_INDUSTRIES } from '../repositories/memory/_seeds.js'

const EventIdParamsSchema = z.object({
  id: z.string().trim().min(1),
})

const EventListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().trim().optional(),
  sortDir: z.enum(['asc', 'desc']).optional(),
  status: z.enum(['draft', 'published', 'active', 'completed', 'cancelled', 'archived']).optional(),
})

const EventCreateBodySchema = z.object({
  name: z.string().trim().min(1),
  slug: z.string().trim().optional(),
  description: z.string().trim().optional(),
  eventDate: z.string().datetime(), // keep backward compatible openapi
  startDate: z.string().datetime().optional(),
  startTime: z.string().regex(/^([0-1]\d|2[0-3]):[0-5]\d$/).optional(),
  endDate: z.string().datetime().optional(),
  endTime: z.string().regex(/^([0-1]\d|2[0-3]):[0-5]\d$/).optional(),
  timezone: z.enum(['Asia/Jakarta', 'Asia/Makassar', 'Asia/Jayapura']),
  capacity: z.number().int().min(1).optional(),
  venue: z.string().trim().optional(),
  industryTags: z.array(z.string().trim()).optional(),
  eventType: z.enum(['conference', 'workshop', 'networking', 'seminar', 'webinar']).optional(),
  topicTags: z.array(z.string().trim()).optional(),
  targetCriteria: z.record(z.string(), z.unknown()).optional(),
  approvalMode: z.enum(['auto', 'hybrid', 'manual']).default('manual'),
  notificationChannel: z.enum(['email', 'whatsapp']).default('email'),
  scanFormat: z.enum(['qr']).default('qr'),
  isPaid: z.boolean().default(false),
  price: z.number().min(0).nullable().optional(),
  paymentMethod: z.string().nullable().optional(),
}).superRefine((val, ctx) => {
  const sDate = val.startDate ?? val.eventDate;
  const eDate = val.endDate ?? val.eventDate;
  if (eDate < sDate) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['endDate'], message: 'Must be after start_date' })
  } else if (eDate === sDate && val.startTime && val.endTime && val.endTime <= val.startTime) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['endTime'], message: 'Must be after start_time' })
  }
  if (val.isPaid && (!val.price || !val.paymentMethod)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['price'], message: 'Price and Payment Method required for paid events' })
  }
})

const EventUpdateBodySchema = z.object({
  name: z.string().trim().min(1).optional(),
  slug: z.string().trim().optional(),
  description: z.string().trim().optional(),
  eventDate: z.string().datetime().optional(),
  startDate: z.string().datetime().optional(),
  startTime: z.string().regex(/^([0-1]\d|2[0-3]):[0-5]\d$/).optional(),
  endDate: z.string().datetime().optional(),
  endTime: z.string().regex(/^([0-1]\d|2[0-3]):[0-5]\d$/).optional(),
  timezone: z.enum(['Asia/Jakarta', 'Asia/Makassar', 'Asia/Jayapura']).optional(),
  capacity: z.number().int().min(1).optional(),
  status: z.enum(['draft', 'published', 'active', 'completed', 'cancelled', 'archived']).optional(),
  targetCriteria: z.record(z.string(), z.unknown()).optional(),
  approvalMode: z.enum(['auto', 'hybrid', 'manual']).optional(),
  notificationChannel: z.enum(['email', 'whatsapp']).optional(),
  scanFormat: z.enum(['qr']).optional(),
  isPaid: z.boolean().optional(),
  price: z.number().min(0).nullable().optional(),
  paymentMethod: z.string().nullable().optional(),
}).superRefine((val, ctx) => {
  const sDate = val.startDate ?? val.eventDate;
  const eDate = val.endDate ?? val.eventDate;
  if (sDate && eDate && eDate < sDate) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['endDate'], message: 'Must be after start_date' })
  } else if (sDate && eDate && sDate === eDate && val.startTime && val.endTime && val.endTime <= val.startTime) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['endTime'], message: 'Must be after start_time' })
  }
  if (val.isPaid === true && (!val.price || !val.paymentMethod)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['price'], message: 'Price and Payment Method required for paid events' })
  }
})

const EventRegistrationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['pending', 'confirmed', 'approved', 'rejected', 'waitlisted', 'attended', 'cancelled']).optional(),
})

const BlastBodySchema = z.object({
  templateId: z.string().trim().optional(),
  customMessage: z.string().trim().optional(),
  channel: z.enum(['email', 'whatsapp']),
  filters: z.object({
    industries: z.array(z.string()).optional(),
    cities: z.array(z.string()).optional(),
    companySizes: z.array(z.string()).optional(),
    jobTitles: z.array(z.string()).optional(),
    behavior: z.array(z.enum(['most_active', 'low_attendance', 'never_attended'])).optional(),
    lastAttendedBefore: z.string().optional(),
  }).optional(),
  contactIds: z.array(z.string().trim().min(1)).optional(),
  scheduledAt: z.string().datetime().optional(),
}).superRefine((value, ctx) => {
  if (value.filters && value.contactIds) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['contactIds'],
      message: 'filters and contactIds are mutually exclusive',
    })
  }
  if (!value.templateId && !value.customMessage) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['customMessage'],
      message: 'Either templateId or customMessage must be provided',
    })
  }
})

const SurveySchemaBody = z.object({
  schema: z.record(z.string(), z.unknown()),
  uiSchema: z.record(z.string(), z.unknown()).default({}),
})

const AudienceRecommendationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  minScore: z.coerce.number().int().min(0).max(100).default(0),
})

const AudiencePreviewBodySchema = z.object({
  industries: z.array(z.string()).optional(),
  cities: z.array(z.string()).optional(),
  companySizes: z.array(z.string()).optional(),
  jobTitles: z.array(z.string()).optional(),
  behavior: z.array(z.enum(['most_active', 'low_attendance', 'never_attended'])).optional(),
  lastAttendedBefore: z.string().optional(),
})

function replyValidationError(reply: FastifyReply, details: unknown, message: string) {
  return reply.status(400).send({
    error: {
      code: 'VALIDATION_ERROR',
      message,
      details,
    },
  })
}

function toEventDto(event: Event, surveySchema?: unknown, registeredCount: number = 0) {
  return {
    id: event.id,
    name: event.name,
    slug: event.slug,
    description: event.description ?? '',
    status: event.status,
    eventDate: event.startDate,
    startDate: event.startDate,
    endDate: event.endDate,
    startTime: event.startTime,
    endTime: event.endTime,
    timezone: event.timezone,
    capacity: event.capacity ?? undefined,
    registeredCount,
    targetCriteria: event.targetCriteria ?? {},
    surveySchema: surveySchema ?? {},
    venue: event.venue ?? '',
    industryTags: event.targetCriteria?.industries ?? [],
    eventType: 'conference',
    topicTags: [],
    createdAt: event.createdAt,
    updatedAt: event.updatedAt,
    isPaid: event.isPaid,
    price: event.price,
    paymentMethod: event.paymentMethod,
    approvalMode: event.approvalMode,
    scanFormat: event.scanFormat,
    notificationChannel: event.notificationChannel,
  }
}

function toRegistrationDto(registration: Registration, surveyAnswers: Record<string, unknown> = {}) {
  return {
    id: registration.id,
    contactId: registration.contactId,
    eventId: registration.eventId,
    status: registration.status,
    ticketToken: registration.ticketToken,
    surveyAnswers,
    attendedAt: registration.attendedAt,
    createdAt: registration.createdAt,
  }
}

function fieldsToSurveyContract(fields: Array<{ key: string; label: string; type: string; required: boolean; options?: string[] }>) {
  const schema: Record<string, unknown> = {
    type: 'object',
    properties: {},
    required: [] as string[],
  }
  const uiSchema: Record<string, unknown> = {}

  for (const field of fields) {
    const properties = schema.properties as Record<string, Record<string, unknown>>
    const property: Record<string, unknown> = { title: field.label }

    if (field.type === 'number') {
      property.type = 'number'
    } else if (field.type === 'checkbox') {
      property.type = 'array'
      property.items = { type: 'string', enum: field.options ?? [] }
      property.uniqueItems = true
      uiSchema[field.key] = { 'ui:widget': 'checkboxes' }
    } else if (field.type === 'radio') {
      property.type = 'string'
      property.enum = field.options ?? []
      uiSchema[field.key] = { 'ui:widget': 'radio' }
    } else if (field.type === 'select') {
      property.type = 'string'
      property.enum = field.options ?? []
    } else {
      property.type = 'string'
    }

    properties[field.key] = property
    if (field.required) {
      ;(schema.required as string[]).push(field.key)
    }
  }

  return { schema, uiSchema }
}

function toRegistrationWithContactDto(registration: Registration, contact: Awaited<ReturnType<typeof contactRepository.findById>>) {
  return {
    ...toRegistrationDto(registration),
    contactName: contact?.name ?? 'Unknown Contact',
    contactEmail: contact?.email ?? null,
    contactPhone: contact?.phone ?? '',
    contactFlagCategory: contact?.flagCategory ?? null,
    aiScore: Math.max(0, Math.min(99, Math.round((registration.aiScore ?? 0) * 100))),
    flagOverride: registration.flagOverride,
  }
}

/**
 * Mengubah daftar industry id event ke slug FE agar URL blast tetap bersih.
 */
function toIndustryTags(event: Event | null): string[] {
  return (event?.targetCriteria?.industries ?? []).map((industryId) => {
    const found = INDONESIAN_INDUSTRIES.find((item) => item.id === industryId || item.slug === industryId)
    return found?.slug ?? industryId
  })
}

async function requireEventOr404(reply: FastifyReply, eventId: string) {
  const event = await eventRepository.findById(eventId)
  if (!event) {
    await reply.status(404).send({
      error: { code: 'NOT_FOUND', message: 'Event not found', details: [] },
    })
    return null
  }
  return event
}

async function requireEventAccessOr403(
  reply: FastifyReply,
  user: JwtPayload | undefined,
  eventId: string,
) {
  if (!user || user.role === 'admin' || user.role === 'participant') return true

  const assigned = await userRepository.getAssignedEvents(user.sub)
  if (!assigned.includes(eventId)) {
    await reply.status(403).send({
      error: { code: 'EVENT_ACCESS_DENIED', message: 'No access to this event', details: [] },
    })
    return false
  }

  return true
}

export const eventsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/api/events', { preHandler: requireAuth }, async (request, reply) => {
    const parsed = EventListQuerySchema.safeParse(request.query)
    if (!parsed.success) return replyValidationError(reply, parsed.error.issues, 'Invalid query params')

    const query = parsed.data
    validateOpenApiRequest({ path: '/events', method: 'get', query })
    const paginationParams: { page: number; pageSize: number; sortBy?: string; sortDir?: 'asc' | 'desc' } = {
      page: query.page,
      pageSize: query.pageSize,
    }
    if (query.sortBy) paginationParams.sortBy = query.sortBy
    if (query.sortDir) paginationParams.sortDir = query.sortDir

    const eventFilters: { ids?: string[]; status?: 'draft' | 'published' | 'active' | 'completed' | 'cancelled' | 'archived' } = {}
    const user = request.user as JwtPayload | undefined
    if (user && user.role !== 'admin' && user.role !== 'participant') {
      eventFilters.ids = await userRepository.getAssignedEvents(user.sub)
    }
    if (query.status) eventFilters.status = query.status

    const result = await eventRepository.findAll(paginationParams, eventFilters)

    const data = await Promise.all(result.data.map(async (event) => {
      const surveySchema = await surveyRepository.findByEventId(event.id)
      const registrations = await registrationRepository.findByEvent(event.id, { page: 1, pageSize: 1 })
      return toEventDto(event, surveySchema?.fields ?? {}, registrations.total)
    }))

    const responseBody = {
      data,
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total: result.total,
        totalPages: Math.ceil(result.total / query.pageSize),
      },
    }
    validateOpenApiResponse({ path: '/events', method: 'get', status: 200, body: responseBody })
    return reply.status(200).send(responseBody)
  })

  fastify.get('/api/events/check-slug', { preHandler: requireAuth }, async (request, reply) => {
    const CheckSlugQuery = z.object({ slug: z.string().trim().min(1), excludeId: z.string().trim().optional() })
    const parsed = CheckSlugQuery.safeParse(request.query)
    if (!parsed.success) return replyValidationError(reply, parsed.error.issues, 'Invalid query')
    const existing = await eventRepository.findBySlug(parsed.data.slug)
    const isAvailable = !existing || (parsed.data.excludeId && existing.id === parsed.data.excludeId)
    return reply.status(200).send({ available: !!isAvailable })
  })

  fastify.get('/api/events/upcoming-uncontacted', { preHandler: requireAuth }, async (_request, reply) => {
    const upcoming = await eventRepository.getUpcomingUncontacted()

    const event = upcoming ? await eventRepository.findById(upcoming.eventId) : null
    const responseBody = upcoming && event
      ? {
          event: {
            id: event.id,
            name: event.name,
            eventDate: event.startDate,
            industryTags: toIndustryTags(event),
          },
          daysUntil: upcoming.daysTillEvent,
          uncontactedCount: upcoming.uncontactedCount,
        }
      : {
          event: null,
          daysUntil: 0,
          uncontactedCount: 0,
        }

    validateOpenApiResponse({ path: '/events/upcoming-uncontacted', method: 'get', status: 200, body: responseBody })
    return reply.status(200).send(responseBody)
  })

  fastify.post('/api/events', { preHandler: [requireAuth, requireAdmin] }, async (request, reply) => {
    const parsed = EventCreateBodySchema.safeParse(request.body)
    if (!parsed.success) return replyValidationError(reply, parsed.error.issues, 'Invalid request body')

    const payload = parsed.data
    validateOpenApiRequest({ path: '/events', method: 'post', body: payload })
    const baseSlug = payload.slug || payload.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    let finalSlug = baseSlug
    let counter = 2
    while (await eventRepository.findBySlug(finalSlug)) {
      finalSlug = `${baseSlug}-${counter}`
      counter++
    }

    const event = await eventRepository.create({
      name: payload.name,
      slug: finalSlug,
      startDate: payload.startDate ?? payload.eventDate,
      endDate: payload.endDate ?? payload.eventDate,
      startTime: payload.startTime ?? '09:00',
      endTime: payload.endTime ?? '17:00',
      timezone: payload.timezone,
      city: null,
      venue: payload.venue ?? null,
      description: payload.description ?? null,
      capacity: payload.capacity ?? null,
      waitlistBuffer: 10,
      approvalMode: payload.approvalMode,
      notificationChannel: payload.notificationChannel,
      scanFormat: payload.scanFormat,
      isPaid: payload.isPaid,
      price: payload.price ?? null,
      paymentMethod: payload.paymentMethod ?? null,
      targetCriteria: payload.targetCriteria ? { ...payload.targetCriteria } : {
        industries: payload.industryTags ?? [],
      },
      surveySchemaId: null,
      vendorId: null,
      status: 'draft',
      deletedAt: null,
    })
    const registrations = await registrationRepository.findByEvent(event.id, { page: 1, pageSize: 1 })
    const token = request.user as JwtPayload
    await auditLogRepository.create({
      action: 'event.created',
      actorId: token?.sub ?? null,
      actorRole: token?.role ?? 'system',
      eventId: event.id,
      targetId: event.id,
      targetType: 'event',
      metadata: { slug: event.slug },
    })

    const responseBody = toEventDto(event, undefined, registrations.total)
    validateOpenApiResponse({ path: '/events', method: 'post', status: 201, body: responseBody })
    return reply.status(201).send(responseBody)
  })

  fastify.get('/api/events/:id', { preHandler: requireAuth }, async (request, reply) => {
    const parsed = EventIdParamsSchema.safeParse(request.params)
    if (!parsed.success) return replyValidationError(reply, parsed.error.issues, 'Invalid event id')
    const event = await requireEventOr404(reply, parsed.data.id)
    if (!event) return
    const allowed = await requireEventAccessOr403(reply, request.user as JwtPayload | undefined, event.id)
    if (!allowed) return
    const surveySchema = await surveyRepository.findByEventId(event.id)
    validateOpenApiRequest({ path: '/events/{id}', method: 'get', params: parsed.data })
    const registrations = await registrationRepository.findByEvent(event.id, { page: 1, pageSize: 1 })
    const responseBody = toEventDto(event, surveySchema?.fields ?? {}, registrations.total)
    validateOpenApiResponse({ path: '/events/{id}', method: 'get', status: 200, body: responseBody })
    return reply.status(200).send(responseBody)
  })

  fastify.put('/api/events/:id', { preHandler: [requireAuth, requireAdmin] }, async (request, reply) => {
    const params = EventIdParamsSchema.safeParse(request.params)
    const body = EventUpdateBodySchema.safeParse(request.body)
    if (!params.success || !body.success) {
      return replyValidationError(reply, [
        ...(params.success ? [] : params.error.issues),
        ...(body.success ? [] : body.error.issues),
      ], 'Invalid update payload')
    }
    const existing = await requireEventOr404(reply, params.data.id)
    if (!existing) return
    const updateData: Partial<Event> = {}
    if (body.data.name !== undefined) updateData.name = body.data.name
    if (body.data.slug !== undefined) updateData.slug = body.data.slug
    if (body.data.description !== undefined) updateData.description = body.data.description
    if (body.data.eventDate !== undefined) {
      updateData.startDate = body.data.eventDate
      updateData.endDate = body.data.eventDate
    }
    if (body.data.startDate !== undefined) updateData.startDate = body.data.startDate
    if (body.data.endDate !== undefined) updateData.endDate = body.data.endDate
    if (body.data.startTime !== undefined) updateData.startTime = body.data.startTime
    if (body.data.endTime !== undefined) updateData.endTime = body.data.endTime
    if (body.data.timezone !== undefined) updateData.timezone = body.data.timezone
    if (body.data.capacity !== undefined) updateData.capacity = body.data.capacity
    if (body.data.status !== undefined) updateData.status = body.data.status
    if (body.data.approvalMode !== undefined) updateData.approvalMode = body.data.approvalMode
    if (body.data.notificationChannel !== undefined) updateData.notificationChannel = body.data.notificationChannel
    if (body.data.scanFormat !== undefined) updateData.scanFormat = body.data.scanFormat
    if (body.data.isPaid !== undefined) updateData.isPaid = body.data.isPaid
    if (body.data.price !== undefined) updateData.price = body.data.price
    if (body.data.paymentMethod !== undefined) updateData.paymentMethod = body.data.paymentMethod
    if (body.data.targetCriteria !== undefined) updateData.targetCriteria = body.data.targetCriteria as Event['targetCriteria']

    const updated = await eventRepository.update(existing.id, updateData)
    const registrations = await registrationRepository.findByEvent(existing.id, { page: 1, pageSize: 1 })
    
    const token = request.user as JwtPayload
    await auditLogRepository.create({
      action: 'event.updated',
      actorId: token?.sub ?? null,
      actorRole: token?.role ?? 'system',
      eventId: existing.id,
      targetId: existing.id,
      targetType: 'event',
      metadata: { fieldsUpdated: Object.keys(updateData) },
    })

    return reply.status(200).send(toEventDto((updated ?? existing) as Event, undefined, registrations.total))
  })

  fastify.delete('/api/events/:id', { preHandler: [requireAuth, requireAdmin] }, async (request, reply) => {
    const parsed = EventIdParamsSchema.safeParse(request.params)
    if (!parsed.success) return replyValidationError(reply, parsed.error.issues, 'Invalid event id')
    const event = await requireEventOr404(reply, parsed.data.id)
    if (!event) return
    await eventRepository.softDelete(event.id)
    return reply.status(204).send()
  })

  fastify.post('/api/events/:id/clone', { preHandler: [requireAuth, requireAdmin] }, async (request, reply) => {
    const parsed = EventIdParamsSchema.safeParse(request.params)
    if (!parsed.success) return replyValidationError(reply, parsed.error.issues, 'Invalid event id')
    const event = await requireEventOr404(reply, parsed.data.id)
    if (!event) return

    validateOpenApiRequest({ path: '/events/{id}/clone', method: 'post', params: parsed.data })

    const clonedEventName = `${event.name} (Copy)`
    // Generating a unique slug based on timestamp
    const clonedEventSlug = `${event.slug}-copy-${Date.now()}`

    const clonedEvent = await eventRepository.create({
      name: clonedEventName,
      slug: clonedEventSlug,
      startDate: event.startDate,
      endDate: event.endDate,
      startTime: event.startTime,
      endTime: event.endTime,
      timezone: event.timezone,
      city: event.city,
      venue: event.venue,
      description: event.description,
      capacity: event.capacity,
      waitlistBuffer: event.waitlistBuffer,
      approvalMode: event.approvalMode,
      notificationChannel: event.notificationChannel,
      scanFormat: event.scanFormat,
      targetCriteria: event.targetCriteria ? JSON.parse(JSON.stringify(event.targetCriteria)) : null,
      surveySchemaId: null, // we will recreate survey below
      vendorId: event.vendorId,
      status: 'draft',
      isPaid: event.isPaid,
      price: event.price,
      paymentMethod: event.paymentMethod,
      deletedAt: null,
    })

    const surveySchema = await surveyRepository.findByEventId(event.id)
    let clonedSurveySchemaFields: any = {}

    if (surveySchema) {
      const newSurveySchemaId = `${clonedEvent.id}-survey`
      const clonedSurvey = await surveyRepository.upsert(clonedEvent.id, {
        id: newSurveySchemaId,
        eventId: clonedEvent.id,
        fields: surveySchema.fields ? JSON.parse(JSON.stringify(surveySchema.fields)) : [],
        schema: surveySchema.schema ? JSON.parse(JSON.stringify(surveySchema.schema)) : undefined,
        uiSchema: surveySchema.uiSchema ? JSON.parse(JSON.stringify(surveySchema.uiSchema)) : undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      clonedSurveySchemaFields = clonedSurvey.schema ? { schema: clonedSurvey.schema, uiSchema: clonedSurvey.uiSchema ?? {} } : clonedSurvey.fields
    }

    const payload = request.user as JwtPayload
    await auditLogRepository.create({
      action: 'event.cloned',
      actorId: payload.sub,
      actorRole: payload.role,
      eventId: clonedEvent.id,
      targetId: event.id,
      targetType: 'event',
      metadata: { originalEventId: event.id, newEventId: clonedEvent.id },
    })
    await auditLogRepository.create({
      action: 'event.created',
      actorId: payload.sub,
      actorRole: payload.role,
      eventId: clonedEvent.id,
      targetId: clonedEvent.id,
      targetType: 'event',
      metadata: { method: 'clone', originalEventId: event.id },
    })

    const responseBody = toEventDto(clonedEvent, clonedSurveySchemaFields)
    validateOpenApiResponse({ path: '/events/{id}/clone', method: 'post', status: 201, body: responseBody })
    return reply.status(201).send(responseBody)
  })

  fastify.get('/api/events/:id/registrations', { preHandler: requireAuth }, async (request, reply) => {
    const params = EventIdParamsSchema.safeParse(request.params)
    const query = EventRegistrationsQuerySchema.safeParse(request.query)
    if (!params.success || !query.success) {
      return replyValidationError(reply, [
        ...(params.success ? [] : params.error.issues),
        ...(query.success ? [] : query.error.issues),
      ], 'Invalid event registration query')
    }
    const event = await requireEventOr404(reply, params.data.id)
    if (!event) return
    const allowed = await requireEventAccessOr403(reply, request.user as JwtPayload | undefined, event.id)
    if (!allowed) return
    validateOpenApiRequest({ path: '/events/{id}/registrations', method: 'get', params: params.data, query: query.data })

    const registrationFilters: { status?: 'pending' | 'confirmed' | 'approved' | 'rejected' | 'waitlisted' | 'attended' | 'cancelled' } = {}
    if (query.data.status) registrationFilters.status = query.data.status

    const result = await registrationRepository.findByEvent(event.id, {
      page: query.data.page,
      pageSize: query.data.pageSize,
    }, registrationFilters)

    const data = await Promise.all(result.data.map(async (registration) => {
      const contact = await contactRepository.findById(registration.contactId)
      return toRegistrationWithContactDto(registration, contact)
    }))

    const responseBody = {
      data,
      pagination: {
        page: query.data.page,
        pageSize: query.data.pageSize,
        total: result.total,
        totalPages: Math.ceil(result.total / query.data.pageSize),
      },
    }
    validateOpenApiResponse({ path: '/events/{id}/registrations', method: 'get', status: 200, body: responseBody })
    return reply.status(200).send(responseBody)
  })

  fastify.get('/api/events/:id/analytics', { preHandler: [requireAuth, requireRoles('admin', 'viewer')] }, async (request, reply) => {
    const params = EventIdParamsSchema.safeParse(request.params)
    if (!params.success) return replyValidationError(reply, params.error.issues, 'Invalid event id')
    const event = await requireEventOr404(reply, params.data.id)
    if (!event) return
    const allowed = await requireEventAccessOr403(reply, request.user as JwtPayload | undefined, event.id)
    if (!allowed) return
    validateOpenApiRequest({ path: '/events/{id}/analytics', method: 'get', params: params.data })
    const registrations = await registrationRepository.findByEvent(event.id, { page: 1, pageSize: 500 })
    const total = registrations.total
    const approved = registrations.data.filter((registration) => ['approved', 'attended'].includes(registration.status)).length
    const attended = registrations.data.filter((registration) => registration.status === 'attended').length
    const responseBody = {
      funnelData: [
        { stage: 'registered', count: total },
        { stage: 'approved', count: approved },
        { stage: 'attended', count: attended },
      ],
      industryBreakdown: [{ industry: 'teknologi', count: total }],
      cityBreakdown: [{ city: event.city ?? 'Jakarta', count: total }],
      registrationTimeSeries: registrations.data.slice(0, 7).map((registration) => ({
        date: registration.createdAt.slice(0, 10),
        count: 1,
      })),
    }
    validateOpenApiResponse({ path: '/events/{id}/analytics', method: 'get', status: 200, body: responseBody })
    return reply.status(200).send(responseBody)
  })

  fastify.get('/api/events/:id/yorimind', { preHandler: [requireAuth, requireRoles('admin', 'viewer')] }, async (request, reply) => {
    const params = EventIdParamsSchema.safeParse(request.params)
    if (!params.success) return replyValidationError(reply, params.error.issues, 'Invalid event id')
    const event = await requireEventOr404(reply, params.data.id)
    if (!event) return
    const allowed = await requireEventAccessOr403(reply, request.user as JwtPayload | undefined, event.id)
    if (!allowed) return
    validateOpenApiRequest({ path: '/events/{id}/yorimind', method: 'get', params: params.data })
    const registrations = await registrationRepository.findByEvent(event.id, { page: 1, pageSize: 100 })
    const snapshot = {
      eventId: event.id,
      eventName: event.name,
      eventDate: event.startDate,
      capacity: event.capacity,
      registrationCount: registrations.total,
      approvedCount: registrations.data.filter((registration) => ['approved', 'attended'].includes(registration.status)).length,
      attendedCount: registrations.data.filter((registration) => registration.status === 'attended').length,
      conversionRate: registrations.total === 0 ? 0 : registrations.data.filter((registration) => registration.status === 'attended').length / registrations.total,
      registrations: await Promise.all(registrations.data.map(async (registration) => ({
        id: registration.id,
        contactName: (await contactRepository.findById(registration.contactId))?.name ?? 'Unknown Contact',
        status: registration.status,
        aiScore: registration.aiScore,
      }))),
    }
    const result = await yoriMindService.analyze(snapshot)
    const responseBody = {
      analysis: result.summary,
      root_causes: result.insights,
      recommendations: result.recommendations.map((action) => ({
        action,
        impact: 'medium',
        priority: 'medium',
      })),
      summary: result.summary,
      tracked_metrics: ['registrationCount', 'approvedCount', 'attendedCount'],
    }
    validateOpenApiResponse({ path: '/events/{id}/yorimind', method: 'get', status: 200, body: responseBody })
    return reply.status(200).send(responseBody)
  })

  fastify.get('/api/events/:id/attendance-stats', { preHandler: [requireAuth, requireRoles('admin', 'staff')] }, async (request, reply) => {
    const params = EventIdParamsSchema.safeParse(request.params)
    if (!params.success) return replyValidationError(reply, params.error.issues, 'Invalid event id')
    const event = await requireEventOr404(reply, params.data.id)
    if (!event) return
    const allowed = await requireEventAccessOr403(reply, request.user as JwtPayload | undefined, event.id)
    if (!allowed) return
    validateOpenApiRequest({ path: '/events/{id}/attendance-stats', method: 'get', params: params.data })
    const registrations = await registrationRepository.findByEvent(event.id, { page: 1, pageSize: 500 })
    const attended = registrations.data.filter((registration) => registration.status === 'attended').length
    const responseBody = {
      total: registrations.total,
      attended,
      pending: Math.max(registrations.total - attended, 0),
    }
    validateOpenApiResponse({ path: '/events/{id}/attendance-stats', method: 'get', status: 200, body: responseBody })
    return reply.status(200).send(responseBody)
  })

  fastify.get('/api/events/:id/checkin/stats', { preHandler: [requireAuth, requireRoles('admin', 'staff')] }, async (request, reply) => {
    const params = EventIdParamsSchema.safeParse(request.params)
    if (!params.success) return replyValidationError(reply, params.error.issues, 'Invalid event id')
    const event = await requireEventOr404(reply, params.data.id)
    if (!event) return
    const allowed = await requireEventAccessOr403(reply, request.user as JwtPayload | undefined, event.id)
    if (!allowed) return
    validateOpenApiRequest({ path: '/events/{id}/checkin/stats', method: 'get', params: params.data })
    const registrations = await registrationRepository.findByEvent(event.id, { page: 1, pageSize: 500 })
    const approved = registrations.data.filter((registration) => registration.status === 'approved').length
    const attended = registrations.data.filter((registration) => registration.status === 'attended').length
    const responseBody = {
      approved,
      attended,
      total: approved + attended,
    }
    validateOpenApiResponse({ path: '/events/{id}/checkin/stats', method: 'get', status: 200, body: responseBody })
    return reply.status(200).send(responseBody)
  })

  fastify.get('/api/events/:id/survey', async (request, reply) => {
    const params = EventIdParamsSchema.safeParse(request.params)
    if (!params.success) return replyValidationError(reply, params.error.issues, 'Invalid event id')
    const event = await requireEventOr404(reply, params.data.id)
    if (!event) return
    const user = request.user as JwtPayload | undefined
    if (user) {
      const allowed = await requireEventAccessOr403(reply, user, event.id)
      if (!allowed) return
    }
    validateOpenApiRequest({ path: '/events/{id}/survey', method: 'get', params: params.data })
    const schema = await surveyRepository.findByEventId(event.id)
    if (!schema) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Survey schema not found', details: [] },
      })
    }
    const surveyPayload = schema.schema ? { schema: schema.schema, uiSchema: schema.uiSchema ?? {} } : fieldsToSurveyContract(schema.fields)
    validateOpenApiResponse({ path: '/events/{id}/survey', method: 'get', status: 200, body: surveyPayload })
    return reply.status(200).send(surveyPayload)
  })

  fastify.put('/api/events/:id/survey', { preHandler: [requireAuth, requireAdmin] }, async (request, reply) => {
    const params = EventIdParamsSchema.safeParse(request.params)
    const body = SurveySchemaBody.safeParse(request.body)
    if (!params.success || !body.success) {
      return replyValidationError(reply, [
        ...(params.success ? [] : params.error.issues),
        ...(body.success ? [] : body.error.issues),
      ], 'Invalid survey schema payload')
    }
    const event = await requireEventOr404(reply, params.data.id)
    if (!event) return
    validateOpenApiRequest({ path: '/events/{id}/survey', method: 'put', params: params.data, body: body.data })
    const existing = await surveyRepository.findByEventId(event.id)
    const savedSurvey = await surveyRepository.upsert(event.id, {
      id: existing?.id ?? `${event.id}-survey`,
      eventId: event.id,
      fields: existing?.fields ?? [],
      schema: body.data.schema,
      uiSchema: body.data.uiSchema,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    const responseBody = {
      schema: savedSurvey.schema ?? {},
      uiSchema: savedSurvey.uiSchema ?? {},
    }
    validateOpenApiResponse({ path: '/events/{id}/survey', method: 'put', status: 200, body: responseBody })
    return reply.status(200).send(responseBody)
  })

  fastify.post('/api/events/:id/audience-preview', { preHandler: [requireAuth, requireAdmin] }, async (request, reply) => {
    const params = EventIdParamsSchema.safeParse(request.params)
    const body = AudiencePreviewBodySchema.safeParse(request.body)
    if (!params.success || !body.success) {
      return replyValidationError(reply, [
        ...(params.success ? [] : params.error.issues),
        ...(body.success ? [] : body.error.issues),
      ], 'Invalid audience preview payload')
    }
    const event = await requireEventOr404(reply, params.data.id)
    if (!event) return
    validateOpenApiRequest({ path: '/events/{id}/audience-preview', method: 'post', params: params.data, body: request.body })
    
    // Simulate complex criteria filtering
    // In a real app we would pass these to contactRepository.countMatches or similar
    const contacts = await contactRepository.findAll({ page: 1, pageSize: 1000 })
    let filtered = contacts.data

    if (body.data.industries && body.data.industries.length > 0) {
      filtered = filtered.filter(c => c.industryId && body.data.industries!.includes(c.industryId))
    }
    if (body.data.cities && body.data.cities.length > 0) {
      filtered = filtered.filter(c => c.city && body.data.cities!.includes(c.city))
    }
    if (body.data.companySizes && body.data.companySizes.length > 0) {
      filtered = filtered.filter(c => c.companySize && body.data.companySizes!.includes(c.companySize))
    }

    const breakdown = {
      industries: body.data.industries?.length ? body.data.industries.length * 5 : 0,
      cities: body.data.cities?.length ? body.data.cities.length * 5 : 0,
      behavior: body.data.behavior?.length ? body.data.behavior.length * 5 : 0,
    }

    const responseBody = {
      matchCount: filtered.length,
      breakdown,
    }
    validateOpenApiResponse({ path: '/events/{id}/audience-preview', method: 'post', status: 200, body: responseBody })
    return reply.status(200).send(responseBody)
  })

  fastify.get('/api/events/:id/audience-recommendations', { preHandler: [requireAuth, requireAdmin] }, async (request, reply) => {
    const params = EventIdParamsSchema.safeParse(request.params)
    const query = AudienceRecommendationQuerySchema.safeParse(request.query)
    if (!params.success || !query.success) {
      return replyValidationError(reply, [
        ...(params.success ? [] : params.error.issues),
        ...(query.success ? [] : query.error.issues),
      ], 'Invalid audience recommendation query')
    }
    const event = await requireEventOr404(reply, params.data.id)
    if (!event) return
    validateOpenApiRequest({ path: '/events/{id}/audience-recommendations', method: 'get', params: params.data, query: query.data })
    const contacts = await contactRepository.findAll({ page: 1, pageSize: 200 })
    const recommendations = contacts.data
      .map((contact, index) => ({
        contactId: contact.id,
        name: contact.name,
        email: contact.email ?? '',
        phone: contact.phone,
        industryId: contact.industryId ?? '',
        city: contact.city ?? '',
        companySize: contact.companySize ?? '',
        score: Math.max(0, 100 - index),
        factors: [
          `event:${event.slug}`,
          contact.city ? `city:${contact.city.toLowerCase()}` : 'city:unknown',
        ],
        reliabilityRate: 0.72,
      }))
      .filter((contact) => contact.score >= query.data.minScore)
      .slice(0, query.data.limit)
    const responseBody = {
      recommendations,
      totalMatched: recommendations.length,
      totalExcluded: 0,
      excludedReasons: {},
    }
    validateOpenApiResponse({ path: '/events/{id}/audience-recommendations', method: 'get', status: 200, body: responseBody })
    return reply.status(200).send(responseBody)
  })

  fastify.post('/api/events/:id/blast', { preHandler: [requireAuth, requireAdmin] }, async (request, reply) => {
    const params = EventIdParamsSchema.safeParse(request.params)
    const body = BlastBodySchema.safeParse(request.body)
    if (!params.success || !body.success) {
      return replyValidationError(reply, [
        ...(params.success ? [] : params.error.issues),
        ...(body.success ? [] : body.error.issues),
      ], 'Invalid blast payload')
    }

    const event = await requireEventOr404(reply, params.data.id)
    if (!event) return
    validateOpenApiRequest({ path: '/events/{id}/blast', method: 'post', params: params.data, body: body.data })
    const payload = request.user as JwtPayload
    const contactFilters: { industries?: string[]; cities?: string[]; companySizes?: string[]; jobTitles?: string[]; behavior?: string[]; lastAttendedBefore?: string } = {}
    if (body.data.filters?.industries) contactFilters.industries = body.data.filters.industries
    if (body.data.filters?.cities) contactFilters.cities = body.data.filters.cities
    if (body.data.filters?.companySizes) contactFilters.companySizes = body.data.filters.companySizes
    if (body.data.filters?.jobTitles) contactFilters.jobTitles = body.data.filters.jobTitles
    if (body.data.filters?.behavior) contactFilters.behavior = body.data.filters.behavior
    if (body.data.filters?.lastAttendedBefore) contactFilters.lastAttendedBefore = body.data.filters.lastAttendedBefore

    const recipientCount = body.data.contactIds?.length ?? (await contactRepository.findAll({ page: 1, pageSize: 500 }, contactFilters)).total
    let templateName = 'Custom Message'
    let templateBody = body.data.customMessage || 'Mocked template body for ' + (body.data.templateId ?? 'unknown')

    const queueName = body.data.channel === 'whatsapp' ? 'marketing' : 'transactional'
    const jobId = await queueService.enqueue(queueName, {
      eventId: event.id,
      templateId: body.data.templateId ?? 'custom',
      templateName,
      templateBody,
      customMessage: body.data.customMessage,
      channel: body.data.channel,
      filters: body.data.filters,
      contactIds: body.data.contactIds,
      scheduledAt: body.data.scheduledAt,
      requestedBy: payload.sub,
    }, body.data.scheduledAt ? { delay: Math.max(new Date(body.data.scheduledAt).getTime() - Date.now(), 0) } : undefined)

    await auditLogRepository.create({
      action: 'blast.queued',
      actorId: payload.sub,
      actorRole: payload.role,
      eventId: event.id,
      targetId: event.id,
      targetType: 'event',
      metadata: {
        jobId,
        channel: body.data.channel,
      },
    })

    const responseBody = {
      jobId,
      status: body.data.scheduledAt ? 'scheduled' : 'queued',
      scheduledAt: body.data.scheduledAt,
      recipientCount,
    }
    validateOpenApiResponse({ path: '/events/{id}/blast', method: 'post', status: 202, body: responseBody })
    return reply.status(202).send(responseBody)
  })
}
