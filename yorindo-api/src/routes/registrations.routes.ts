import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import {
  auditLogRepository,
  contactRepository,
  emailService,
  eventRepository,
  registrationRepository,
  surveyRepository,
  whatsAppService,
} from '../container.js'
import { requireAdmin, requireAuth, requireRoles } from '../middleware/auth.js'
import type { Contact, Registration } from '../types/domain.js'
import { validateOpenApiRequest, validateOpenApiResponse } from '../lib/openapi-contract.js'

const RegistrationIdParamsSchema = z.object({
  id: z.string().trim().min(1),
})

const RegistrationListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(500).default(20),
  sortBy: z.string().trim().optional(),
  sortDir: z.enum(['asc', 'desc']).optional(),
  status: z.enum(['pending', 'confirmed', 'approved', 'rejected', 'waitlisted', 'attended', 'cancelled']).optional(),
  eventId: z.string().trim().optional(),
})

const CreateRegistrationBodySchema = z.object({
  eventId: z.string().trim().min(1),
  name: z.string().trim().min(1),
  email: z.string().email(),
  phone: z.string().trim().min(8),
  surveyAnswers: z.record(z.string(), z.unknown()).optional(),
})

const UpdateRegistrationStatusBodySchema = z.object({
  status: z.enum(['pending', 'confirmed', 'approved', 'rejected', 'waitlisted', 'attended', 'cancelled']),
})

const BulkApproveBodySchema = z.object({
  ids: z.array(z.string().trim().min(1)).min(1),
})

const ResendTicketResponseSchema = z.object({
  accepted: z.literal(true),
  registrationId: z.string().trim().min(1),
  channel: z.enum(['email', 'whatsapp']),
  resentAt: z.string().datetime(),
})

function validationError(reply: FastifyReply, details: unknown, message: string) {
  return reply.status(400).send({
    error: { code: 'VALIDATION_ERROR', message, details },
  })
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

function normalizeApprovedEmail(value: unknown): string | null {
  if (value === null || value === undefined) return null
  const email = String(value).trim().toLowerCase()
  if (!email) return null
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null
}

function toRegistrationWithContactDto(registration: Registration, contact: Contact | null) {
  return {
    ...toRegistrationDto(registration),
    contactName: contact?.name ?? 'Unknown Contact',
    contactCompany: contact?.company ?? '',
    contactEmail: normalizeApprovedEmail(contact?.email),
    contactPhone: contact?.phone ?? '',
    contactFlagCategory: contact?.flagCategory ?? null,
    aiScore: Math.max(0, Math.min(99, Math.round((registration.aiScore ?? 0) * 100))),
    flagOverride: registration.flagOverride,
  }
}

async function getSurveyAnswers(registration: Registration) {
  const responses = await surveyRepository.getResponsesByEvent(registration.eventId)
  return responses.find((response) => response.registrationId === registration.id)?.answers ?? {}
}

async function buildRegistrationWithContact(registration: Registration) {
  const contact = await contactRepository.findById(registration.contactId)
  return toRegistrationWithContactDto(registration, contact)
}

async function handleStatusUpdate(request: any, reply: FastifyReply, method: 'post' | 'put' | 'patch') {
  const params = RegistrationIdParamsSchema.safeParse(request.params)
  const body = UpdateRegistrationStatusBodySchema.safeParse(request.body)
  if (!params.success || !body.success) {
    return validationError(reply, [
      ...(params.success ? [] : params.error.issues),
      ...(body.success ? [] : body.error.issues),
    ], 'Invalid registration status update payload')
  }
  validateOpenApiRequest({ path: '/registrations/{id}/status', method, params: params.data, body: body.data })
  const updated = await registrationRepository.updateStatus(params.data.id, body.data.status)
  if (!updated) {
    return reply.status(404).send({
      error: { code: 'NOT_FOUND', message: 'Registration not found', details: [] },
    })
  }
  const responseBody = {
    ...(await buildRegistrationWithContact(updated)),
    surveyAnswers: await getSurveyAnswers(updated),
  }
  validateOpenApiResponse({ path: '/registrations/{id}/status', method, status: 200, body: responseBody })
  return reply.status(200).send(responseBody)
}

export const registrationsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/api/registrations', {
    config: {
      rateLimit: {
        max: 10,
        timeWindow: '1 hour',
      },
    },
  }, async (request, reply) => {
    const parsed = CreateRegistrationBodySchema.safeParse(request.body)
    if (!parsed.success) return validationError(reply, parsed.error.issues, 'Invalid registration payload')

    const payload = parsed.data
    validateOpenApiRequest({ path: '/registrations', method: 'post', body: payload })
    const event = await eventRepository.findById(payload.eventId)
    if (!event) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Event not found', details: [] },
      })
    }

    const existingContact = await contactRepository.findByPhone(payload.phone)
    const contact = existingContact
      ? await contactRepository.update(existingContact.id, { name: payload.name, email: payload.email })
      : await contactRepository.upsert({
          name: payload.name,
          phone: payload.phone,
          email: payload.email,
          serviceType: null,
          jobTitle: null,
          city: null,
          provinceCode: null,
          provinceName: null,
          cityCode: null,
          cityName: null,
          company: null,
          department: null,
          eventDate: null,
          source: 'form',
          completenessScore: 0.55,
          consentStatus: 'active',
          flagCategory: null,
          deletedAt: null,
        })

    const registration = await registrationRepository.create({
      contactId: (contact ?? existingContact)!.id,
      eventId: event.id,
      status: 'pending',
      ticketToken: null,
      aiScore: 0.5,
      flagOverride: false,
      approvedAt: null,
      attendedAt: null,
    })

    if (payload.surveyAnswers && Object.keys(payload.surveyAnswers).length > 0) {
      await surveyRepository.saveResponse(registration.id, payload.surveyAnswers)
    }

    const responseBody = toRegistrationDto(registration, payload.surveyAnswers ?? {})
    validateOpenApiResponse({ path: '/registrations', method: 'post', status: 201, body: responseBody })
    return reply.status(201).send(responseBody)
  })

  fastify.get('/api/registrations', { preHandler: requireAuth }, async (request, reply) => {
    const parsed = RegistrationListQuerySchema.safeParse(request.query)
    if (!parsed.success) return validationError(reply, parsed.error.issues, 'Invalid registration query')

    const query = parsed.data
    validateOpenApiRequest({ path: '/registrations', method: 'get', query })
    const paginationParams: { page: number; pageSize: number; sortBy?: string; sortDir?: 'asc' | 'desc' } = {
      page: query.page,
      pageSize: query.pageSize,
    }
    if (query.sortBy) paginationParams.sortBy = query.sortBy
    if (query.sortDir) paginationParams.sortDir = query.sortDir

    const filters: { eventId?: string; status?: 'pending' | 'confirmed' | 'approved' | 'rejected' | 'waitlisted' | 'attended' | 'cancelled' } = {}
    if (query.eventId) filters.eventId = query.eventId
    if (query.status) filters.status = query.status

    const result = await registrationRepository.findAll(paginationParams, filters)

    const data = await Promise.all(result.data.map(async (registration) => {
      const dto = await buildRegistrationWithContact(registration)
      return {
        ...dto,
        surveyAnswers: await getSurveyAnswers(registration),
      }
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
    validateOpenApiResponse({ path: '/registrations', method: 'get', status: 200, body: responseBody })
    return reply.status(200).send(responseBody)
  })

  fastify.get('/api/registrations/:id', { preHandler: requireAuth }, async (request, reply) => {
    const parsed = RegistrationIdParamsSchema.safeParse(request.params)
    if (!parsed.success) return validationError(reply, parsed.error.issues, 'Invalid registration id')
    validateOpenApiRequest({ path: '/registrations/{id}', method: 'get', params: parsed.data })
    const registration = await registrationRepository.findById(parsed.data.id)
    if (!registration) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Registration not found', details: [] },
      })
    }
    const responseBody = {
      ...(await buildRegistrationWithContact(registration)),
      surveyAnswers: await getSurveyAnswers(registration),
    }
    validateOpenApiResponse({ path: '/registrations/{id}', method: 'get', status: 200, body: responseBody })
    return reply.status(200).send(responseBody)
  })

  fastify.post('/api/registrations/:id/status', { preHandler: [requireAuth, requireAdmin] }, async (request, reply) => handleStatusUpdate(request, reply, 'post'))
  fastify.put('/api/registrations/:id/status', { preHandler: [requireAuth, requireAdmin] }, async (request, reply) => handleStatusUpdate(request, reply, 'put'))
  fastify.patch('/api/registrations/:id/status', { preHandler: [requireAuth, requireAdmin] }, async (request, reply) => handleStatusUpdate(request, reply, 'patch'))

  fastify.post('/api/registrations/:id/cancel', { preHandler: requireAuth }, async (request, reply) => {
    const params = RegistrationIdParamsSchema.safeParse(request.params)
    if (!params.success) return validationError(reply, params.error.issues, 'Invalid registration id')
    validateOpenApiRequest({ path: '/registrations/{id}/cancel', method: 'post', params: params.data })
    const updated = await registrationRepository.updateStatus(params.data.id, 'cancelled')
    if (!updated) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Registration not found', details: [] },
      })
    }
    const responseBody = toRegistrationDto(updated, await getSurveyAnswers(updated))
    validateOpenApiResponse({ path: '/registrations/{id}/cancel', method: 'post', status: 200, body: responseBody })
    return reply.status(200).send(responseBody)
  })

  const clearRegistrationFlagHandler = async (request: FastifyRequest, reply: FastifyReply) => {
    const params = RegistrationIdParamsSchema.safeParse(request.params)
    if (!params.success) return validationError(reply, params.error.issues, 'Invalid registration id')
    validateOpenApiRequest({ path: '/registrations/{id}/clear-flag', method: 'post', params: params.data })
    const updated = await registrationRepository.update(params.data.id, { flagOverride: true })
    if (!updated) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Registration not found', details: [] },
      })
    }
    const contact = await contactRepository.findById(updated.contactId)
    const responseBody = toRegistrationWithContactDto(updated, contact)
    validateOpenApiResponse({ path: '/registrations/{id}/clear-flag', method: 'post', status: 200, body: responseBody })
    return reply.status(200).send(responseBody)
  }

  fastify.post('/api/registrations/:id/clear-flag', { preHandler: [requireAuth, requireRoles('admin', 'staff')] }, clearRegistrationFlagHandler)
  fastify.patch('/api/registrations/:id/clear-flag', { preHandler: [requireAuth, requireRoles('admin', 'staff')] }, clearRegistrationFlagHandler)

  fastify.post('/api/registrations/:id/resend-ticket', { preHandler: [requireAuth, requireAdmin] }, async (request, reply) => {
    const params = RegistrationIdParamsSchema.safeParse(request.params)
    if (!params.success) return validationError(reply, params.error.issues, 'Invalid registration id')
    validateOpenApiRequest({ path: '/registrations/{id}/resend-ticket', method: 'post', params: params.data })

    const registration = await registrationRepository.findById(params.data.id)
    if (!registration) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Registration not found', details: [] },
      })
    }
    if (registration.status !== 'approved') {
      return reply.status(409).send({
        error: {
          code: 'INVALID_REGISTRATION_STATUS',
          message: 'Ticket resend is only available for approved registrations awaiting confirmation',
          details: [{ status: registration.status }],
        },
      })
    }

    const contact = await contactRepository.findById(registration.contactId)
    if (!contact) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Contact not found', details: [] },
      })
    }

    const event = await eventRepository.findById(registration.eventId)
    if (!event) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Event not found', details: [] },
      })
    }

    const channel = event.notificationChannel === 'email' && contact.email ? 'email' : 'whatsapp'
    const resentAt = new Date().toISOString()

    if (channel === 'email') {
      await emailService.send({
        to: contact.email ?? '',
        subject: `Tiket untuk ${event.name}`,
        body: `Tiket Anda untuk ${event.name} telah dikirim ulang.`,
        templateId: 'ticket-resend',
        variables: {
          name: contact.name,
          eventName: event.name,
          ticketToken: registration.ticketToken ?? '',
        },
      })
    } else {
      await whatsAppService.send({
        to: contact.phone ?? '',
        templateName: 'ticket_resend',
        body: `Tiket untuk ${event.name} telah dikirim ulang kepada ${contact.name}.`,
        variables: {
          name: contact.name,
          eventName: event.name,
          ticketToken: registration.ticketToken ?? '',
        },
      })
    }

    await auditLogRepository.create({
      action: 'registration.ticket_resent',
      actorId: request.user?.sub ?? null,
      actorRole: request.user?.role ?? 'admin',
      eventId: event.id,
      targetId: registration.id,
      targetType: 'registration',
      metadata: { channel, ticketToken: registration.ticketToken },
    })

    const responseBody = ResendTicketResponseSchema.parse({
      accepted: true,
      registrationId: registration.id,
      channel,
      resentAt,
    })
    validateOpenApiResponse({ path: '/registrations/{id}/resend-ticket', method: 'post', status: 202, body: responseBody })
    return reply.status(202).send(responseBody)
  })

  const bulkApproveRegistrationsHandler = async (request: FastifyRequest, reply: FastifyReply) => {
    const body = BulkApproveBodySchema.safeParse(request.body)
    if (!body.success) return validationError(reply, body.error.issues, 'Invalid bulk approve payload')
    validateOpenApiRequest({ path: '/registrations/bulk-approve', method: 'put', body: body.data })
    const result = await registrationRepository.bulkApprove(body.data.ids)
    const responseBody = {
      approved: result.approved,
      total: body.data.ids.length,
    }
    validateOpenApiResponse({ path: '/registrations/bulk-approve', method: 'put', status: 200, body: responseBody })
    return reply.status(200).send(responseBody)
  }

  fastify.put('/api/registrations/bulk-approve', { preHandler: [requireAuth, requireRoles('admin', 'staff')] }, bulkApproveRegistrationsHandler)
  fastify.patch('/api/registrations/bulk-approve', { preHandler: [requireAuth, requireRoles('admin', 'staff')] }, bulkApproveRegistrationsHandler)
}
