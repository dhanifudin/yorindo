import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import {
  auditLogRepository,
  blastLogRecipientRepository,
  contactRepository,
  eventRepository,
  queueService,
  registrationRepository,
  surveyRepository,
  userRepository,
  insightsService,
  vendorRepository,
  eventSponsorRepository,
  templateRepository,
} from '../container.js'
import { blastProgressStore } from '../lib/blast-progress-store.js'
import { getRedisOptional } from '../lib/redis.js'
import { getPool } from '../lib/postgres.js'
import { requireAdmin, requireAuth, requireRoles, type JwtPayload } from '../middleware/auth.js'
import type { Event, EventStatus, Registration, TargetCriteria } from '../types/domain.js'
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
  deleted: z.coerce.boolean().optional(),
  hasSurvey: z.enum(['registration', 'post-event']).optional(),
})

const EventCreateBodySchema = z.object({
  name: z.string().trim().min(1),
  slug: z.string().trim().optional(),
  description: z.string().trim().optional(),
  bannerUrl: z.string().min(1).optional().nullable(),
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
  bannerUrl: z.string().min(1).optional().nullable(),
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
  postSurveyEnabled: z.boolean().optional(),
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
  pageSize: z.coerce.number().int().min(1).max(500).default(20),
  status: z.enum(['pending', 'confirmed', 'approved', 'rejected', 'waitlisted', 'attended', 'cancelled']).optional(),
})

const BlastBodySchema = z.object({
  templateId: z.string().trim().optional(),
  customMessage: z.string().trim().optional(),
  channel: z.enum(['email', 'whatsapp']),
  filters: z.object({
    serviceTypes: z.array(z.string()).optional(),
    cities: z.array(z.string()).optional(),
    jobTitles: z.array(z.string()).optional(),
    topicTags: z.array(z.string()).optional(),
    behavior: z.array(z.enum(['most_active', 'low_attendance', 'never_attended'])).optional(),
    lastAttendedBefore: z.string().optional(),
  }).optional(),
  contactIds: z.array(z.string().trim().min(1)).optional(),
  scheduledAt: z.string().trim().datetime().optional(),
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

const AudienceRecommendationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  minScore: z.coerce.number().int().min(0).max(100).default(0),
})

const EventSponsorVendorIdParamsSchema = z.object({
  id: z.string().trim().min(1),
  vendorId: z.string().trim().min(1),
})

const CreateEventSponsorBodySchema = z.object({
  vendor_id: z.string().trim().min(1),
  tier: z.enum(['premium', 'standard', 'supporter']),
  display_order: z.number().int().min(1),
})

const UpdateEventSponsorBodySchema = z.object({
  tier: z.enum(['premium', 'standard', 'supporter']).optional(),
  display_order: z.number().int().min(1).optional(),
})

const AudiencePreviewBodySchema = z.object({
  serviceTypes: z.array(z.string()).optional(),
  cities: z.array(z.string()).optional(),
  jobTitles: z.array(z.string()).optional(),
  behavior: z.array(z.enum(['most_active', 'low_attendance', 'never_attended'])).optional(),
  lastAttendedBefore: z.string().datetime({ offset: true }).optional(),
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
    bannerUrl: event.bannerUrl ?? undefined,
    targetCriteria: event.targetCriteria ?? {},
    surveySchema: surveySchema ?? {},
    venue: event.venue ?? '',
    industryTags: event.targetCriteria?.serviceTypes ?? [],
    eventType: 'conference',
    topicTags: event.topicTags ?? [],
    deletedAt: event.deletedAt,
    createdAt: event.createdAt,
    updatedAt: event.updatedAt,
    isPaid: event.isPaid,
    price: event.price,
    paymentMethod: event.paymentMethod,
    approvalMode: event.approvalMode,
    scanFormat: event.scanFormat,
    notificationChannel: event.notificationChannel,
    postSurveyEnabled: event.postSurveyEnabled ?? false,
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

function toConfirmationChannel(event: Event, contact: Awaited<ReturnType<typeof contactRepository.findById>>): 'email' | 'whatsapp' {
  if (event.notificationChannel === 'email' && contact?.email) return 'email'
  return 'whatsapp'
}

function toConfirmationStatus(registration: Registration): 'confirmed' | 'pending' {
  if (registration.status === 'confirmed' || registration.status === 'attended') return 'confirmed'
  return 'pending'
}

const EVENT_STATUS_TRANSITIONS: Record<EventStatus, EventStatus[]> = {
  draft: ['published'],
  published: ['active', 'cancelled'],
  active: ['completed', 'cancelled'],
  completed: ['archived'],
  cancelled: [],
  archived: [],
}

function isValidEventStatusTransition(from: EventStatus, to: EventStatus) {
  return EVENT_STATUS_TRANSITIONS[from].includes(to)
}

function replyInvalidTransition(reply: FastifyReply, from: EventStatus, to: EventStatus) {
  return reply.status(400).send({
    error: {
      code: 'INVALID_EVENT_TRANSITION',
      message: `Cannot transition event from "${from}" to "${to}"`,
      details: [
        {
          from,
          to,
          allowedTransitions: EVENT_STATUS_TRANSITIONS[from],
        },
      ],
    },
  })
}

async function updateEventHandler(request: FastifyRequest, reply: FastifyReply) {
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
  const method = request.method.toLowerCase() as 'put' | 'patch'
  validateOpenApiRequest({ path: '/events/{id}', method, params: params.data, body: body.data })

  const updateData: Partial<Event> = {}
  if (body.data.name !== undefined) updateData.name = body.data.name
  if (body.data.description !== undefined) updateData.description = body.data.description
  if (body.data.eventDate !== undefined) {
    updateData.startDate = body.data.eventDate
    updateData.endDate = body.data.eventDate
  }
  if (body.data.timezone !== undefined) updateData.timezone = body.data.timezone
  if (body.data.capacity !== undefined) updateData.capacity = body.data.capacity
  if (body.data.targetCriteria !== undefined) updateData.targetCriteria = body.data.targetCriteria as Event['targetCriteria']

  if (body.data.status !== undefined) {
    if (body.data.status !== existing.status && !isValidEventStatusTransition(existing.status, body.data.status)) {
      return replyInvalidTransition(reply, existing.status, body.data.status)
    }
    updateData.status = body.data.status
  }

  const updated = await eventRepository.update(existing.id, updateData)
  const result = updated ?? existing

  if (body.data.status !== undefined && body.data.status !== existing.status) {
    const actor = request.user as JwtPayload
    await auditLogRepository.create({
      action: 'event.status_change',
      actorId: actor.sub,
      actorRole: actor.role,
      eventId: result.id,
      targetId: result.id,
      targetType: 'event',
      metadata: {
        from: existing.status,
        to: result.status,
      },
    })
  }

  const responseBody = toEventDto(result)
  validateOpenApiResponse({ path: '/events/{id}', method, status: 200, body: responseBody })
  return reply.status(200).send(responseBody)
}

function toIndustryTags(event: Event | null): string[] {
  return event?.targetCriteria?.serviceTypes ?? []
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

async function restoreEventHandler(request: FastifyRequest, reply: FastifyReply) {
  const parsed = EventIdParamsSchema.safeParse(request.params)
  if (!parsed.success) return replyValidationError(reply, parsed.error.issues, 'Invalid event id')

  const deletedEvents = await eventRepository.findAll({ page: 1, pageSize: 500 }, { deleted: 'only' })
  const event = deletedEvents.data.find((item) => item.id === parsed.data.id)

  if (!event) {
    return reply.status(404).send({
      error: { code: 'NOT_FOUND', message: 'Event not found in deleted items', details: [] },
    })
  }

  const deletedAt = new Date(event.deletedAt ?? 0).getTime()
  if (!Number.isNaN(deletedAt) && Date.now() - deletedAt > 30 * 86400000) {
    return reply.status(400).send({
      error: {
        code: 'RECOVERY_WINDOW_EXPIRED',
        message: 'This event can no longer be restored because the 30-day recovery window has expired',
        details: [],
      },
    })
  }

  const method = request.method.toLowerCase() as 'post' | 'patch'
  validateOpenApiRequest({ path: '/events/{id}/restore', method, params: parsed.data })
  await eventRepository.restore(event.id)
  const restored = await eventRepository.findById(event.id)

  if (!restored) {
    return reply.status(500).send({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to restore event', details: [] },
    })
  }

  const payload = request.user as JwtPayload
  await auditLogRepository.create({
    action: 'event.restored',
    actorId: payload.sub,
    actorRole: payload.role,
    eventId: restored.id,
    targetId: restored.id,
    targetType: 'event',
    metadata: { deletedAt: event.deletedAt, restoredAt: restored.updatedAt },
  })

  const responseBody = toEventDto(restored)
  validateOpenApiResponse({ path: '/events/{id}/restore', method, status: 200, body: responseBody })
  return reply.status(200).send(responseBody)
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

    const eventFilters: {
      ids?: string[]
      status?: 'draft' | 'published' | 'active' | 'completed' | 'cancelled' | 'archived'
      deleted?: 'exclude' | 'only'
      hasSurvey?: 'registration' | 'post-event'
    } = {}
    const user = request.user as JwtPayload | undefined
    if (user && user.role !== 'admin' && user.role !== 'participant') {
      eventFilters.ids = await userRepository.getAssignedEvents(user.sub)
    }
    if (query.status) eventFilters.status = query.status
    if (query.deleted) eventFilters.deleted = 'only'
    if (query.hasSurvey) eventFilters.hasSurvey = query.hasSurvey

    let result = await eventRepository.findAll(paginationParams, eventFilters)

    // Filter by survey presence if requested
    if (query.hasSurvey) {
      const eventsWithSurvey = []
      for (const event of result.data) {
        const survey = await surveyRepository.findByEventId(event.id, query.hasSurvey)
        if (survey) eventsWithSurvey.push(event)
      }
      result = { data: eventsWithSurvey, total: eventsWithSurvey.length }
    }

    const data = await Promise.all(result.data.map(async (event) => {
      const surveySchema = await surveyRepository.findByEventId(event.id, 'registration')
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
      bannerUrl: payload.bannerUrl ?? null,
      capacity: payload.capacity ?? null,
      waitlistBuffer: 10,
      approvalMode: payload.approvalMode,
      notificationChannel: payload.notificationChannel,
      scanFormat: payload.scanFormat,
      isPaid: payload.isPaid,
      price: payload.price ?? null,
      paymentMethod: payload.paymentMethod ?? null,
      targetCriteria: payload.targetCriteria ? { ...payload.targetCriteria } : {
        serviceTypes: payload.industryTags ?? [],
      },
      topicTags: payload.topicTags ?? null,
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

  fastify.get('/api/events/public/:slug', async (request, reply) => {
    const { slug } = request.params as { slug: string }
    const event = await eventRepository.findBySlug(slug)
    if (!event) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Event not found', details: [] },
      })
    }
    const surveySchema = await surveyRepository.findByEventId(event.id, 'registration')
    return reply.status(200).send(toEventDto(event, surveySchema?.fields ?? {}))
  })

  fastify.get('/api/events/:id', { preHandler: requireAuth }, async (request, reply) => {
    const parsed = EventIdParamsSchema.safeParse(request.params)
    if (!parsed.success) return replyValidationError(reply, parsed.error.issues, 'Invalid event id')
    const event = await requireEventOr404(reply, parsed.data.id)
    if (!event) return
    const allowed = await requireEventAccessOr403(reply, request.user as JwtPayload | undefined, event.id)
    if (!allowed) return
    const surveySchema = await surveyRepository.findByEventId(event.id, 'registration')
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
    if (body.data.bannerUrl !== undefined) updateData.bannerUrl = body.data.bannerUrl ?? null
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

  fastify.patch('/api/events/:id', { preHandler: [requireAuth, requireAdmin] }, async (request, reply) => {
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
    if (body.data.status !== undefined) {
      if (body.data.status !== existing.status && !isValidEventStatusTransition(existing.status, body.data.status)) {
        return replyInvalidTransition(reply, existing.status, body.data.status)
      }
      updateData.status = body.data.status
    }
    if (body.data.postSurveyEnabled !== undefined) {
      updateData.postSurveyEnabled = body.data.postSurveyEnabled
    }
    if (body.data.bannerUrl !== undefined) {
      updateData.bannerUrl = body.data.bannerUrl ?? null
    }

    if (Object.keys(updateData).length === 0) {
      return reply.status(200).send(toEventDto(existing, undefined, 0))
    }

    const updated = await eventRepository.update(existing.id, updateData)
    const result = updated ?? existing

    if (body.data.status !== undefined && body.data.status !== existing.status) {
      const actor = request.user as JwtPayload
      await auditLogRepository.create({
        action: 'event.status_change',
        actorId: actor.sub,
        actorRole: actor.role,
        eventId: result.id,
        targetId: result.id,
        targetType: 'event',
        metadata: { from: existing.status, to: body.data.status },
      })
    }

    const registrations = await registrationRepository.findByEvent(existing.id, { page: 1, pageSize: 1 })
    return reply.status(200).send(toEventDto(result, undefined, registrations.total))
  })

  fastify.delete('/api/events/:id', { preHandler: [requireAuth, requireAdmin] }, async (request, reply) => {
    const parsed = EventIdParamsSchema.safeParse(request.params)
    if (!parsed.success) return replyValidationError(reply, parsed.error.issues, 'Invalid event id')
    const event = await requireEventOr404(reply, parsed.data.id)
    if (!event) return
    await eventRepository.softDelete(event.id)
    return reply.status(204).send()
  })

  fastify.post('/api/events/:id/restore', { preHandler: [requireAuth, requireAdmin] }, restoreEventHandler)
  fastify.patch('/api/events/:id/restore', { preHandler: [requireAuth, requireAdmin] }, restoreEventHandler)

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
      bannerUrl: event.bannerUrl,
      capacity: event.capacity,
      waitlistBuffer: event.waitlistBuffer,
      approvalMode: event.approvalMode,
      notificationChannel: event.notificationChannel,
      scanFormat: event.scanFormat,
      targetCriteria: event.targetCriteria ? JSON.parse(JSON.stringify(event.targetCriteria)) : null,
      topicTags: event.topicTags ? [...event.topicTags] : null,
      surveySchemaId: null, // we will recreate survey below
      vendorId: event.vendorId,
      status: 'draft',
      isPaid: event.isPaid,
      price: event.price,
      paymentMethod: event.paymentMethod,
      deletedAt: null,
    })

    const surveySchema = await surveyRepository.findByEventId(event.id, 'registration')
    let clonedSurveySchemaFields: any = {}

    if (surveySchema) {
      const newSurveySchemaId = `${clonedEvent.id}-survey-registration`
      const clonedSurvey = await surveyRepository.upsert(clonedEvent.id, 'registration', {
        id: newSurveySchemaId,
        eventId: clonedEvent.id,
        type: 'registration',
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

  // ── GET /api/events/:id/report ─────────────────────────────────────────────
  fastify.get('/api/events/:id/report', { preHandler: [requireAuth, requireRoles('admin', 'viewer')] }, async (request, reply) => {
    const params = EventIdParamsSchema.safeParse(request.params)
    if (!params.success) return replyValidationError(reply, params.error.issues, 'Invalid event id')
    const event = await requireEventOr404(reply, params.data.id)
    if (!event) return
    const allowed = await requireEventAccessOr403(reply, request.user as JwtPayload | undefined, event.id)
    if (!allowed) return
    validateOpenApiRequest({ path: '/events/{id}/report', method: 'get', params: params.data })

    const registrations = await registrationRepository.findByEvent(event.id, { page: 1, pageSize: 1000 })
    const totalInvited = event.capacity ?? 0
    const registered = registrations.total
    const approved = registrations.data.filter((r) => ['approved', 'attended'].includes(r.status)).length
    const attended = registrations.data.filter((r) => r.status === 'attended').length
    const attendanceRate = approved > 0 ? ((attended / approved) * 100).toFixed(1) : '0.0'
    const noShowRate = approved > 0 ? (((approved - attended) / approved) * 100).toFixed(1) : '0.0'

    // Build breakdowns from registration data
    const contacts = await Promise.all(registrations.data.map((r) => contactRepository.findById(r.contactId)))
    const validContacts = contacts.filter((c): c is NonNullable<typeof c> => c !== null)

    const industryMap = new Map<string, number>()
    const cityMap = new Map<string, number>()
    const jobTitleMap = new Map<string, number>()

    for (const contact of validContacts) {
      if (contact.serviceType) {
        industryMap.set(contact.serviceType, (industryMap.get(contact.serviceType) ?? 0) + 1)
      }
      if (contact.city) {
        cityMap.set(contact.city, (cityMap.get(contact.city) ?? 0) + 1)
      }
      if (contact.jobTitle) {
        jobTitleMap.set(contact.jobTitle, (jobTitleMap.get(contact.jobTitle) ?? 0) + 1)
      }
    }

    const industryBreakdown = Array.from(industryMap.entries())
      .map(([industry, count]) => ({ industry, count }))
      .sort((a, b) => b.count - a.count)

    const cityBreakdown = Array.from(cityMap.entries())
      .map(([city, count]) => ({ city, count }))
      .sort((a, b) => b.count - a.count)

    const jobTitleBreakdown = Array.from(jobTitleMap.entries())
      .map(([level, count]) => ({ level, count }))
      .sort((a, b) => b.count - a.count)

    const responseBody = {
      eventId: event.id,
      totalInvited,
      registered,
      approved,
      attended,
      attendanceRate,
      noShowRate,
      industryBreakdown,
      cityBreakdown,
      jobTitleBreakdown,
    }
    validateOpenApiResponse({ path: '/events/{id}/report', method: 'get', status: 200, body: responseBody })
    return reply.status(200).send(responseBody)
  })

  // ── GET /api/events/:id/completion-stats ──────────────────────────────────
  fastify.get('/api/events/:id/completion-stats', { preHandler: [requireAuth, requireRoles('admin', 'viewer')] }, async (request, reply) => {
    const params = EventIdParamsSchema.safeParse(request.params)
    if (!params.success) return replyValidationError(reply, params.error.issues, 'Invalid event id')
    const event = await requireEventOr404(reply, params.data.id)
    if (!event) return
    const allowed = await requireEventAccessOr403(reply, request.user as JwtPayload | undefined, event.id)
    if (!allowed) return

    const pool = (eventRepository as unknown as { pool: import('pg').Pool }).pool
    const eventId = params.data.id

    const attendeeFilter = `(r.status = 'attended' OR (r.status = 'approved' AND r.attended_at IS NOT NULL))`

    const [citiesRes, industriesRes, jobTitlesRes, segmentRes] = await Promise.all([
      pool.query<{ name: string; count: string }>(
        `SELECT c.city AS name, COUNT(*) AS count
         FROM registrations r JOIN contacts c ON c.id = r.contact_id
         WHERE r.event_id = $1 AND ${attendeeFilter} AND c.city IS NOT NULL
         GROUP BY c.city ORDER BY count DESC LIMIT 3`,
        [eventId],
      ),
      pool.query<{ name: string; count: string }>(
        `SELECT c.service_type AS name, COUNT(*) AS count
         FROM registrations r JOIN contacts c ON c.id = r.contact_id
         WHERE r.event_id = $1 AND ${attendeeFilter} AND c.service_type IS NOT NULL
         GROUP BY c.service_type ORDER BY count DESC LIMIT 3`,
        [eventId],
      ),
      pool.query<{ name: string; count: string }>(
        `SELECT c.job_title AS name, COUNT(*) AS count
         FROM registrations r JOIN contacts c ON c.id = r.contact_id
         WHERE r.event_id = $1 AND ${attendeeFilter} AND c.job_title IS NOT NULL
         GROUP BY c.job_title ORDER BY count DESC LIMIT 3`,
        [eventId],
      ),
      pool.query<{ industry: string; city: string; attended: string; approved: string; rate: string }>(
        `SELECT c.service_type AS industry, c.city,
           COUNT(*) FILTER (WHERE ${attendeeFilter}) AS attended,
           COUNT(*) FILTER (WHERE r.status IN ('approved','attended')) AS approved,
           ROUND(COUNT(*) FILTER (WHERE ${attendeeFilter})::numeric /
             NULLIF(COUNT(*) FILTER (WHERE r.status IN ('approved','attended')), 0) * 100) AS rate
         FROM registrations r JOIN contacts c ON c.id = r.contact_id
         WHERE r.event_id = $1
         GROUP BY c.service_type, c.city
         HAVING COUNT(*) FILTER (WHERE r.status IN ('approved','attended')) >= 3
         ORDER BY rate DESC, attended DESC LIMIT 10`,
        [eventId],
      ),
    ])

    return reply.status(200).send({
      demography: {
        cities:     citiesRes.rows.map((r) => ({ name: r.name, count: parseInt(r.count, 10) })),
        industries: industriesRes.rows.map((r) => ({ name: r.name, count: parseInt(r.count, 10) })),
        jobTitles:  jobTitlesRes.rows.map((r) => ({ name: r.name, count: parseInt(r.count, 10) })),
      },
      segmentOverlap: segmentRes.rows.map((r) => ({
        industry: r.industry,
        city:     r.city,
        attended: parseInt(r.attended, 10),
        approved: parseInt(r.approved, 10),
        rate:     parseInt(r.rate, 10),
      })),
    })
  })

  fastify.get('/api/events/:id/insights', { preHandler: [requireAuth, requireRoles('admin', 'viewer')] }, async (request, reply) => {
    const params = EventIdParamsSchema.safeParse(request.params)
    if (!params.success) return replyValidationError(reply, params.error.issues, 'Invalid event id')
    const event = await requireEventOr404(reply, params.data.id)
    if (!event) return
    const allowed = await requireEventAccessOr403(reply, request.user as JwtPayload | undefined, event.id)
    if (!allowed) return
    validateOpenApiRequest({ path: '/events/{id}/insights', method: 'get', params: params.data })

    // Check Redis cache first (TTL 7 days)
    const redis = getRedisOptional()
    const cacheKey = `insights:event:${params.data.id}`
    if (redis) {
      const cached = await redis.get(cacheKey)
      if (cached) {
        return reply.status(200).send(JSON.parse(cached))
      }
    }

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
    const result = await insightsService.analyze(snapshot)
    const responseBody = {
      disabled: result.disabled ?? false,
      summary: result.summary,
      analysis: result.analysis,
      root_causes: result.root_causes,
      recommendations: result.recommendations,
      tracked_metrics: result.tracked_metrics,
      generatedAt: result.generatedAt,
    }
    validateOpenApiResponse({ path: '/events/{id}/insights', method: 'get', status: 200, body: responseBody })

    // Cache in Redis for 7 days
    if (redis) {
      await redis.set(cacheKey, JSON.stringify(responseBody), 'EX', 604800)
    }

    return reply.status(200).send(responseBody)
  })

  fastify.delete('/api/events/:id/insights/cache', { preHandler: [requireAuth, requireRoles('admin', 'viewer')] }, async (request, reply) => {
    const params = EventIdParamsSchema.safeParse(request.params)
    if (!params.success) return replyValidationError(reply, params.error.issues, 'Invalid event id')
    const event = await requireEventOr404(reply, params.data.id)
    if (!event) return
    const allowed = await requireEventAccessOr403(reply, request.user as JwtPayload | undefined, event.id)
    if (!allowed) return

    const redis = getRedisOptional()
    if (redis) {
      await redis.del(`insights:event:${params.data.id}`)
    }

    return reply.status(204).send()
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

  // GET /api/events/:id/participants — search participants by name (for manual checkin)
  fastify.get('/api/events/:id/participants', { preHandler: [requireAuth, requireRoles('admin', 'staff')] }, async (request, reply) => {
    const params = EventIdParamsSchema.safeParse(request.params)
    if (!params.success) return replyValidationError(reply, params.error.issues, 'Invalid event id')
    const event = await requireEventOr404(reply, params.data.id)
    if (!event) return
    const allowed = await requireEventAccessOr403(reply, request.user as JwtPayload | undefined, event.id)
    if (!allowed) return

    const query = request.query as { name?: string }
    const nameFilter = query.name?.trim()

    const registrations = await registrationRepository.findByEvent(event.id, { page: 1, pageSize: 500 })
    const results: Array<{ id: string; name: string; phone: string; ticketToken: string; status: string }> = []

    for (const reg of registrations.data) {
      if (reg.status !== 'approved') continue
      const contact = await contactRepository.findById(reg.contactId)
      if (!contact) continue
      const contactName = contact.name ?? ''
      if (nameFilter && !contactName.toLowerCase().includes(nameFilter.toLowerCase())) continue
      results.push({
        id: reg.id,
        name: contactName,
        phone: contact.phone ?? '',
        ticketToken: reg.ticketToken ?? '',
        status: reg.status,
      })
    }

    return reply.status(200).send({ data: results })
  })

  fastify.get('/api/events/:id/confirmation', { preHandler: [requireAuth, requireRoles('admin', 'staff')] }, async (request, reply) => {
    const params = EventIdParamsSchema.safeParse(request.params)
    if (!params.success) return replyValidationError(reply, params.error.issues, 'Invalid event id')
    const event = await requireEventOr404(reply, params.data.id)
    if (!event) return
    const allowed = await requireEventAccessOr403(reply, request.user as JwtPayload | undefined, event.id)
    if (!allowed) return
    validateOpenApiRequest({ path: '/events/{id}/confirmation', method: 'get', params: params.data })

    const result = await registrationRepository.findByEvent(event.id, { page: 1, pageSize: 500 })
    const relevantRegistrations = result.data.filter((registration) => (
      registration.status === 'approved'
      || registration.status === 'confirmed'
      || registration.status === 'attended'
    ))

    const registrations = await Promise.all(relevantRegistrations.map(async (registration) => {
      const contact = await contactRepository.findById(registration.contactId)
      const confirmationStatus = toConfirmationStatus(registration)
      return {
        id: registration.id,
        contact: {
          name: contact?.name ?? 'Unknown Contact',
          company: contact?.company ?? '-',
        },
        channel: toConfirmationChannel(event, contact),
        ticketSentAt: registration.ticketToken ? (registration.approvedAt ?? registration.createdAt) : null,
        confirmationStatus,
      }
    }))

    const responseBody = {
      stats: {
        ticketSent: registrations.filter((registration) => registration.ticketSentAt !== null).length,
        pendingConfirmation: registrations.filter((registration) => registration.confirmationStatus === 'pending').length,
      },
      registrations,
    }
    validateOpenApiResponse({ path: '/events/{id}/confirmation', method: 'get', status: 200, body: responseBody })
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

    // Use event targetCriteria if no body filters provided
    const bodyData = body.data as Record<string, unknown>
    const effectiveFilters: Record<string, unknown> = { ...bodyData }
    const hasBodyServiceTypes = Array.isArray(bodyData.serviceTypes) && bodyData.serviceTypes.length > 0
    const hasBodyTopicTags = Array.isArray(bodyData.topicTags) && bodyData.topicTags.length > 0
    if (event.targetCriteria && !hasBodyServiceTypes) {
      if (event.targetCriteria.serviceTypes) effectiveFilters.serviceTypes = event.targetCriteria.serviceTypes
      if (event.targetCriteria.cities) effectiveFilters.cities = event.targetCriteria.cities
      if (event.targetCriteria.jobTitles) effectiveFilters.jobTitles = event.targetCriteria.jobTitles
    }

    // Apply event topicTags as secondary filter (contacts must have at least one matching tag)
    if (event.topicTags?.length && !hasBodyTopicTags) {
      effectiveFilters.topicTags = event.topicTags
    }

    // Normalize legacy slug serviceTypes to the display names stored in the contacts table
    const SERVICE_TYPE_SLUG_TO_DISPLAY: Record<string, string> = {
      teknologi: 'Elektronik & Peralatan Rumah Tangga',
      keuangan: 'Fast-Moving Consumer Goods (FMCG)',
      kesehatan: 'Farmasi & Alat Kesehatan',
      manufaktur: 'Fabrikasi Logam & Mesin Presisi',
      retail: 'Tekstil & Garmen',
      pendidikan: 'Yang lain',
      otomotif: 'Otomotif & Komponen',
      energi: 'Energi & Pertambangan',
      properti: 'Properti & Konstruksi',
      telekomunikasi: 'Telekomunikasi',
    }
    if ((effectiveFilters.serviceTypes as string[] | undefined)?.length) {
      effectiveFilters.serviceTypes = (effectiveFilters.serviceTypes as string[]).map(
        (s) => SERVICE_TYPE_SLUG_TO_DISPLAY[s] ?? s,
      )
    }

    // Delegate filtering to the repository (handles slug→ID conversion, excludes deleted)
    const filters: import('../interfaces/repositories/IContactRepository.js').ContactFilters = {
      consentStatus: 'active',       // Exclude suppressed contacts
      flagCategory: 'NONE',          // Exclude flagged contacts
      hasEmail: true,                // Must have email for blast delivery
      hasPhone: true,                // Must have phone for blast delivery
    }
    const svcTypes = effectiveFilters.serviceTypes as string[] | undefined
    const cities = effectiveFilters.cities as string[] | undefined
    const jobTitles = effectiveFilters.jobTitles as string[] | undefined
    const topicTags = effectiveFilters.topicTags as string[] | undefined
    if (svcTypes?.length) filters.serviceTypes = svcTypes
    if (cities?.length) filters.cities = cities
    if (jobTitles?.length) filters.jobTitles = jobTitles
    if (topicTags?.length) filters.topicTags = topicTags

    // Fetch all matching contacts (use large pageSize, rely on total for accurate count)
    const contacts = await contactRepository.findAll({ page: 1, pageSize: 10000 }, filters)
    let matchedContacts = contacts.data
    const matchTotal = contacts.total

    // Apply behavior and lastAttendedBefore filters using registrationRepository
    if (body.data.behavior?.length || body.data.lastAttendedBefore) {
      const allRegistrations = await registrationRepository.findAll({ page: 1, pageSize: 10000 })
      const regsByContact = new Map<string, typeof allRegistrations.data>()
      for (const reg of allRegistrations.data) {
        const list = regsByContact.get(reg.contactId) ?? []
        list.push(reg)
        regsByContact.set(reg.contactId, list)
      }

      if (body.data.behavior?.length) {
        matchedContacts = matchedContacts.filter(c => {
          const regs = regsByContact.get(c.id) ?? []
          const attendedCount = regs.filter(r => r.status === 'attended').length
          const totalRegs = regs.length
          for (const b of body.data.behavior!) {
            if (b === 'most_active' && attendedCount >= 3) return true
            if (b === 'low_attendance' && totalRegs > 0 && attendedCount <= 1) return true
            if (b === 'never_attended' && attendedCount === 0) return true
          }
          return false
        })
      }

      if (body.data.lastAttendedBefore) {
        const cutoff = new Date(body.data.lastAttendedBefore).getTime()
        matchedContacts = matchedContacts.filter(c => {
          const regs = regsByContact.get(c.id) ?? []
          const lastAttended = regs
            .filter(r => r.attendedAt)
            .map(r => new Date(r.attendedAt!).getTime())
            .sort((a, b) => b - a)[0]
          return lastAttended !== undefined && lastAttended < cutoff
        })
      }
    }

    // Build real breakdown from matched contacts
    const serviceTypeBreakdown: Record<string, number> = {}
    const cityBreakdown: Record<string, number> = {}
    const jobTitleBreakdown: Record<string, number> = {}
    for (const c of matchedContacts) {
      if (c.serviceType) serviceTypeBreakdown[c.serviceType] = (serviceTypeBreakdown[c.serviceType] ?? 0) + 1
      if (c.city) cityBreakdown[c.city] = (cityBreakdown[c.city] ?? 0) + 1
      if (c.jobTitle) jobTitleBreakdown[c.jobTitle] = (jobTitleBreakdown[c.jobTitle] ?? 0) + 1
    }

    const breakdown: Record<string, number> = {}
    if (Object.keys(serviceTypeBreakdown).length) Object.assign(breakdown, serviceTypeBreakdown)
    if (Object.keys(cityBreakdown).length) Object.assign(breakdown, cityBreakdown)
    if (Object.keys(jobTitleBreakdown).length) Object.assign(breakdown, jobTitleBreakdown)

    const responseBody = {
      matchCount: body.data.behavior?.length || body.data.lastAttendedBefore ? matchedContacts.length : matchTotal,
      breakdown,
      contacts: matchedContacts.slice(0, 100).map(c => ({
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        city: c.city,
        company: c.company,
        serviceType: c.serviceType,
        jobTitle: c.jobTitle,
      })),
      totalContacts: matchedContacts.length,
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
        serviceType: contact.serviceType ?? '',
        city: contact.city ?? '',
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

    // Clean empty strings to undefined before validation
    const rawBody = request.body as Record<string, unknown>
    if (rawBody.scheduledAt === '') delete rawBody.scheduledAt

    const body = BlastBodySchema.safeParse(rawBody)
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

    // Fall back to event targetCriteria if no body filters provided
    const bodyFilters = body.data.filters
    const hasBodyFilters = bodyFilters && (
      bodyFilters.serviceTypes?.length ||
      bodyFilters.cities?.length ||
      bodyFilters.jobTitles?.length ||
      bodyFilters.behavior?.length
    )

    const contactFilters: TargetCriteria = {}
    if (!hasBodyFilters && event.targetCriteria) {
      if (event.targetCriteria.serviceTypes) contactFilters.serviceTypes = event.targetCriteria.serviceTypes
      if (event.targetCriteria.cities) contactFilters.cities = event.targetCriteria.cities
      if (event.targetCriteria.jobTitles) contactFilters.jobTitles = event.targetCriteria.jobTitles
      if (event.targetCriteria.topicTags) contactFilters.topicTags = event.targetCriteria.topicTags
      if (event.targetCriteria.behavior) contactFilters.behavior = event.targetCriteria.behavior
      if (event.targetCriteria.lastAttendedBefore) contactFilters.lastAttendedBefore = event.targetCriteria.lastAttendedBefore
    } else if (bodyFilters) {
      if (bodyFilters.serviceTypes) contactFilters.serviceTypes = bodyFilters.serviceTypes
      if (bodyFilters.cities) contactFilters.cities = bodyFilters.cities
      if (bodyFilters.jobTitles) contactFilters.jobTitles = bodyFilters.jobTitles
      if (bodyFilters.topicTags) contactFilters.topicTags = bodyFilters.topicTags
      if (bodyFilters.behavior) contactFilters.behavior = bodyFilters.behavior
      if (bodyFilters.lastAttendedBefore) contactFilters.lastAttendedBefore = bodyFilters.lastAttendedBefore
    }

    // Apply event topicTags as secondary filter when no explicit topicTags in body
    if (!contactFilters.topicTags && event.topicTags?.length) {
      contactFilters.topicTags = event.topicTags
    }

    // Fetch actual contacts for recipient tracking
    let contactIds: string[]
    if (body.data.contactIds?.length) {
      contactIds = body.data.contactIds
    } else {
      const result = await contactRepository.findAll(
        { page: 1, pageSize: 500 },
        { ...contactFilters, hasPhone: true, hasEmail: true },
      )
      contactIds = result.data.map(c => c.id)
    }
    const recipientCount = contactIds.length

    // Create blast_logs entry and record recipients for registration source tracking
    try {
      const pool = getPool()
      const blastLogId = `blast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      await pool.query(
        `INSERT INTO blast_logs (id, event_id, template_id, channel, recipient_count, status, sent_at)
         VALUES ($1, $2, $3, $4, $5, 'pending', NOW())`,
        [blastLogId, event.id, body.data.templateId ?? null, body.data.channel, recipientCount],
      )
      if (contactIds.length > 0) {
        await blastLogRecipientRepository.insertRecipients(blastLogId, event.id, contactIds, body.data.channel)
      }
    } catch {
      // Pool not available (tests or non-Postgres mode) — skip recipient tracking
    }

    // Look up template from database (not hardcoded)
    const tmpl = body.data.templateId
      ? await templateRepository.findById(body.data.templateId)
      : null
    const templateName = tmpl?.name ?? 'Custom Message'
    const templateBody = body.data.customMessage ?? tmpl?.body ?? ''

    const queueName = 'marketing'
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
      enqueuedBy: payload.sub,
    }, body.data.scheduledAt ? { delay: Math.max(new Date(body.data.scheduledAt).getTime() - Date.now(), 0) } : undefined)

    // Register job in progress store for real-time tracking
    blastProgressStore.register({
      jobId,
      eventId: event.id,
      channel: body.data.channel,
      templateId: body.data.templateId ?? 'custom',
      templateName,
      totalContacts: recipientCount,
      sentCount: 0,
      failedCount: 0,
      suppressedCount: 0,
      status: body.data.scheduledAt ? 'scheduled' : 'queued',
      startedAt: new Date().toISOString(),
      completedAt: null,
      scheduledAt: body.data.scheduledAt ?? null,
    })

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

  // ── GET /api/blast/history?eventId=:id ───────────────────────────
  fastify.get('/api/blast/history', { preHandler: requireAuth }, async (request, reply) => {
    const url = new URL(request.url, `http://${request.hostname}`)
    const eventId = url.searchParams.get('eventId')

    const jobs = eventId
      ? blastProgressStore.getByEventId(eventId)
      : blastProgressStore.getAll()

    const results = jobs.map((j) => ({
      id: j.jobId,
      channel: j.channel,
      recipientCount: j.totalContacts,
      sentCount: j.sentCount,
      failedCount: j.failedCount,
      suppressedCount: j.suppressedCount,
      status: j.status,
      sentAt: j.startedAt,
      completedAt: j.completedAt,
      templateName: j.templateName,
    }))

    return reply.status(200).send(results)
  })

  // ── GET /api/blast/:jobId ────────────────────────────────────────
  fastify.get('/api/blast/:jobId', { preHandler: requireAuth }, async (request, reply) => {
    const { jobId } = request.params as { jobId: string }
    const job = blastProgressStore.get(jobId)

    if (!job) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Job not found', details: [] },
      })
    }

    return reply.status(200).send({
      jobId: job.jobId,
      status: job.status,
      sent: job.sentCount,
      total: job.totalContacts,
      failed: job.failedCount,
      suppressed: job.suppressedCount,
    })
  })

  // ── GET /api/events/:id/overview ─────────────────────────────────
  fastify.get('/api/events/:id/overview', { preHandler: requireAuth }, async (request, reply) => {
    const params = EventIdParamsSchema.safeParse(request.params)
    if (!params.success) return replyValidationError(reply, params.error.issues, 'Invalid event id')
    const event = await requireEventOr404(reply, params.data.id)
    if (!event) return

    const metrics = await eventRepository.getOverviewMetrics(params.data.id)
    const responseBody = {
      blastCount:       metrics.invited,
      registrationCount: metrics.registered,
      approvedCount:    metrics.approved,
      attendedCount:    metrics.attended,
      otsCount:         metrics.otsCount,
      blastRegistered:  metrics.blastRegistered ?? 0,
      organicRegistered: metrics.organicRegistered ?? 0,
      pendingApprovals: metrics.registered - metrics.approved,
      seatsRemaining:   Math.max((event.capacity ?? 0) - metrics.approved, 0),
      daysUntilEvent:   Math.ceil((new Date(event.startDate).getTime() - Date.now()) / 86400000),
      lastBlastAt:      null,
    }
    return reply.status(200).send(responseBody)
  })

  fastify.get('/api/events/:id/sponsors', { preHandler: [requireAuth, requireRoles('admin', 'viewer')] }, async (request, reply) => {
    const params = EventIdParamsSchema.safeParse(request.params)
    if (!params.success) return replyValidationError(reply, params.error.issues, 'Invalid event id')
    const event = await requireEventOr404(reply, params.data.id)
    if (!event) return
    const allowed = await requireEventAccessOr403(reply, request.user as JwtPayload | undefined, event.id)
    if (!allowed) return

    validateOpenApiRequest({ path: '/events/{id}/sponsors', method: 'get', params: params.data })

    const sponsors = await eventSponsorRepository.findByEvent(event.id)
    const responseBody = sponsors.map((s) => ({
      id: s.id,
      event_id: s.eventId,
      vendor_id: s.vendorId,
      // Vendor name was supposed to be in DB, however, we can fetch it live!
      // But standard says vendor_name is returned
      // The repository returns EventSponsor, which doesn't have vendor_name in domain?
      // Wait, domain DOES NOT have vendor_name! We map it live.
      tier: s.tier,
      display_order: s.displayOrder,
      created_at: s.createdAt,
    }))

    // enhance with vendor_name
    for (const sponsor of responseBody) {
      const vendor = await vendorRepository.findById(sponsor.vendor_id)
        ; (sponsor as any).vendor_name = vendor?.name ?? 'Unknown Vendor'
    }

    validateOpenApiResponse({ path: '/events/{id}/sponsors', method: 'get', status: 200, body: responseBody })
    return reply.status(200).send(responseBody)
  })

  fastify.post('/api/events/:id/sponsors', { preHandler: [requireAuth, requireRoles('admin')] }, async (request, reply) => {
    const params = EventIdParamsSchema.safeParse(request.params)
    const body = CreateEventSponsorBodySchema.safeParse(request.body)
    if (!params.success || !body.success) {
      return replyValidationError(reply, [...(params.success ? [] : params.error.issues), ...(body.success ? [] : body.error.issues)], 'Invalid payload')
    }

    const event = await requireEventOr404(reply, params.data.id)
    if (!event) return

    validateOpenApiRequest({ path: '/events/{id}/sponsors', method: 'post', params: params.data, body: body.data })

    // Check if sponsor already exists
    const existing = await eventSponsorRepository.findByEvent(event.id)
    if (existing.some((s) => s.vendorId === body.data.vendor_id)) {
      return reply.status(409).send({ error: { code: 'CONFLICT', message: 'Vendor already attached to this event', details: [] } })
    }

    const sponsor = await eventSponsorRepository.create({
      eventId: event.id,
      vendorId: body.data.vendor_id,
      tier: body.data.tier,
      displayOrder: body.data.display_order,
    })

    const vendor = await vendorRepository.findById(sponsor.vendorId)

    const responseBody = {
      id: sponsor.id,
      event_id: sponsor.eventId,
      vendor_id: sponsor.vendorId,
      vendor_name: vendor?.name ?? 'Unknown Vendor',
      tier: sponsor.tier,
      display_order: sponsor.displayOrder,
      created_at: sponsor.createdAt,
    }

    validateOpenApiResponse({ path: '/events/{id}/sponsors', method: 'post', status: 201, body: responseBody })
    return reply.status(201).send(responseBody)
  })

  fastify.patch('/api/events/:id/sponsors/:vendorId', { preHandler: [requireAuth, requireRoles('admin')] }, async (request, reply) => {
    const params = EventSponsorVendorIdParamsSchema.safeParse(request.params)
    const body = UpdateEventSponsorBodySchema.safeParse(request.body)
    if (!params.success || !body.success) {
      return replyValidationError(reply, [...(params.success ? [] : params.error.issues), ...(body.success ? [] : body.error.issues)], 'Invalid payload')
    }

    const event = await requireEventOr404(reply, params.data.id)
    if (!event) return

    validateOpenApiRequest({ path: '/events/{id}/sponsors/{vendorId}', method: 'patch', params: params.data, body: body.data })

    const updates: any = {}
    if (body.data.tier) updates.tier = body.data.tier
    if (body.data.display_order) updates.displayOrder = body.data.display_order

    const updated = await eventSponsorRepository.update(event.id, params.data.vendorId, updates)
    if (!updated) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Sponsor not found on this event', details: [] } })
    }

    const vendor = await vendorRepository.findById(updated.vendorId)
    const responseBody = {
      id: updated.id,
      event_id: updated.eventId,
      vendor_id: updated.vendorId,
      vendor_name: vendor?.name ?? 'Unknown Vendor',
      tier: updated.tier,
      display_order: updated.displayOrder,
      created_at: updated.createdAt,
    }

    validateOpenApiResponse({ path: '/events/{id}/sponsors/{vendorId}', method: 'patch', status: 200, body: responseBody })
    return reply.status(200).send(responseBody)
  })

  fastify.delete('/api/events/:id/sponsors/:vendorId', { preHandler: [requireAuth, requireRoles('admin')] }, async (request, reply) => {
    const params = EventSponsorVendorIdParamsSchema.safeParse(request.params)
    if (!params.success) return replyValidationError(reply, params.error.issues, 'Invalid payload')

    const event = await requireEventOr404(reply, params.data.id)
    if (!event) return

    validateOpenApiRequest({ path: '/events/{id}/sponsors/{vendorId}', method: 'delete', params: params.data })

    const deleted = await eventSponsorRepository.delete(event.id, params.data.vendorId)
    if (!deleted) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Sponsor not found on this event', details: [] } })
    }

    return reply.status(204).send()
  })

  // ─────────────────────────────────────────────────────────────────────
  // On-the-Spot Walk-in Registration
  // ─────────────────────────────────────────────────────────────────────
  const OtsBodySchema = z.object({
    name: z.string().trim().min(1),
    email: z.string().email(),
    phone: z.string().trim().min(8),
    company: z.string().trim().optional(),
    industry: z.string().trim().optional(),
    jobTitle: z.string().trim().optional(),
  })

  fastify.post('/api/events/:id/ots', { preHandler: [requireAuth, requireAdmin] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const params = EventIdParamsSchema.safeParse(request.params)
    if (!params.success) return replyValidationError(reply, params.error.issues, 'Invalid event id')

    const event = await requireEventOr404(reply, params.data.id)
    if (!event) return

    const body = OtsBodySchema.safeParse(request.body)
    if (!body.success) return replyValidationError(reply, body.error.issues, 'Invalid registration payload')

    validateOpenApiRequest({ path: '/events/{id}/ots', method: 'post', params: params.data, body: body.data })

    // Check if contact with this email already exists
    let contact = await contactRepository.findByPhone(body.data.phone)

    // Also check by email to prevent duplicate OTS registrations
    if (!contact && body.data.email) {
      const { data: allContacts } = await contactRepository.findAll({ page: 1, pageSize: 1000 })
      contact = allContacts.find(c => (c.email ?? '').toLowerCase() === body.data.email.toLowerCase()) ?? null
    }

    // If contact exists, check if they already have an OTS registration for this event
    if (contact) {
      const existingRegistrations = await registrationRepository.findByEvent(event.id, { page: 1, pageSize: 500 })
      const duplicateOts = existingRegistrations.data.find(
        r => r.contactId === contact!.id && r.status === 'approved' && r.attendedAt
      )
      if (duplicateOts) {
        return reply.status(409).send({
          error: {
            code: 'DUPLICATE_OTS',
            message: `${contact.name} sudah terdaftar sebagai peserta On The Spot untuk event ini`,
            details: [],
          },
        })
      }

      // Update existing contact with latest info
      contact = await contactRepository.update(contact.id, {
        name: body.data.name,
        email: body.data.email,
        serviceType: body.data.industry ?? contact.serviceType,
        jobTitle: body.data.jobTitle ?? contact.jobTitle,
        company: body.data.company ?? contact.company,
      })
    } else {
      contact = await contactRepository.upsert({
        name: body.data.name,
        phone: body.data.phone,
        email: body.data.email,
        serviceType: body.data.industry ?? null,
        jobTitle: body.data.jobTitle ?? null,
        city: null,
        provinceCode: null,
        provinceName: null,
        cityCode: null,
        cityName: null,
        company: body.data.company ?? null,
        department: null,
        eventDate: null,
        topicTags: null,
        source: 'manual',
        completenessScore: 0.6,
        consentStatus: 'active',
        flagCategory: null,
        deletedAt: null,
      })
    }
    if (!contact) {
      return reply.status(500).send({ error: { code: 'INTERNAL_ERROR', message: 'Failed to create contact', details: [] } })
    }

    // Create registration — auto-approved AND marked as attended (OTS)
    const registration = await registrationRepository.create({
      contactId: contact.id,
      eventId: event.id,
      status: 'approved',
      attendedAt: new Date().toISOString(),
      ticketToken: null,
      aiScore: null,
      flagOverride: false,
      approvedAt: new Date().toISOString(),
      registrationSource: 'ots',
    })

    const token = request.user as JwtPayload
    await auditLogRepository.create({
      action: 'registration.ots',
      actorId: token.sub,
      actorRole: token.role,
      eventId: event.id,
      targetId: registration.id,
      targetType: 'registration',
      metadata: { name: body.data.name, phone: body.data.phone },
    })

    return reply.status(201).send({
      id: registration.id,
      contactId: registration.contactId,
      contactName: contact.name ?? '',
      contactPhone: contact.phone ?? '',
      contactEmail: contact.email ?? '',
      contactCompany: contact.company ?? null,
      contactIndustry: contact.serviceType ?? null,
      contactJobTitle: contact.jobTitle ?? null,
      status: registration.status,
      attendedAt: registration.attendedAt,
      createdAt: registration.createdAt,
    })
  })

  // ─────────────────────────────────────────────────────────────────────
  // Recent OTS Registrations for an event
  // ─────────────────────────────────────────────────────────────────────
  fastify.get('/api/events/:id/ots', { preHandler: [requireAuth] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const params = EventIdParamsSchema.safeParse(request.params)
    if (!params.success) return replyValidationError(reply, params.error.issues, 'Invalid event id')

    const event = await requireEventOr404(reply, params.data.id)
    if (!event) return

    // Fetch recent approved+attended registrations (OTS walk-ins)
    const registrations = await registrationRepository.findByEvent(event.id, { page: 1, pageSize: 15 })

    // Filter to only OTS (approved + attended) and enrich with contact data
    const otsRegistrations = registrations.data
      .filter((r): r is typeof r & { attendedAt: string } => r.status === 'approved' && !!r.attendedAt)
      .slice(0, 10)

    const enriched = []
    for (const reg of otsRegistrations) {
      const contact = await contactRepository.findById(reg.contactId)
      if (contact) {
        enriched.push({
          id: reg.id,
          contactName: contact.name,
          contactEmail: contact.email ?? '',
          contactCompany: contact.company ?? null,
          attendedAt: reg.attendedAt,
        })
      }
    }

    // Sort by most recent (attendedAt descending)
    enriched.sort((a, b) => new Date(b.attendedAt).getTime() - new Date(a.attendedAt).getTime())

    return reply.status(200).send({ data: enriched })
  })
}
