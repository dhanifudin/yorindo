import type { FastifyPluginAsync, FastifyReply } from 'fastify'
import { z } from 'zod'
import {
  contactRepository,
  eventRepository,
  registrationRepository,
  surveyRepository,
} from '../container.js'
import { requireAdmin, requireAuth, requireRoles } from '../middleware/auth.js'
import type { Contact, Registration } from '../types/domain.js'

const RegistrationIdParamsSchema = z.object({
  id: z.string().trim().min(1),
})

const RegistrationListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
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

function toRegistrationWithContactDto(registration: Registration, contact: Contact | null) {
  return {
    ...toRegistrationDto(registration),
    contactName: contact?.name ?? 'Unknown Contact',
    contactEmail: contact?.email ?? '',
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
          industryId: null,
          jobTitleId: null,
          city: null,
          company: null,
          companySize: null,
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

    return reply.status(201).send(toRegistrationDto(registration, payload.surveyAnswers ?? {}))
  })

  fastify.get('/api/registrations', { preHandler: requireAuth }, async (request, reply) => {
    const parsed = RegistrationListQuerySchema.safeParse(request.query)
    if (!parsed.success) return validationError(reply, parsed.error.issues, 'Invalid registration query')

    const query = parsed.data
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

    const data = await Promise.all(result.data.map(async (registration) => toRegistrationDto(registration, await getSurveyAnswers(registration))))

    return reply.status(200).send({
      data,
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total: result.total,
        totalPages: Math.ceil(result.total / query.pageSize),
      },
    })
  })

  fastify.get('/api/registrations/:id', { preHandler: requireAuth }, async (request, reply) => {
    const parsed = RegistrationIdParamsSchema.safeParse(request.params)
    if (!parsed.success) return validationError(reply, parsed.error.issues, 'Invalid registration id')
    const registration = await registrationRepository.findById(parsed.data.id)
    if (!registration) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Registration not found', details: [] },
      })
    }
    return reply.status(200).send(toRegistrationDto(registration, await getSurveyAnswers(registration)))
  })

  fastify.post('/api/registrations/:id/status', { preHandler: [requireAuth, requireAdmin] }, async (request, reply) => {
    const params = RegistrationIdParamsSchema.safeParse(request.params)
    const body = UpdateRegistrationStatusBodySchema.safeParse(request.body)
    if (!params.success || !body.success) {
      return validationError(reply, [
        ...(params.success ? [] : params.error.issues),
        ...(body.success ? [] : body.error.issues),
      ], 'Invalid registration status update payload')
    }
    const updated = await registrationRepository.updateStatus(params.data.id, body.data.status)
    if (!updated) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Registration not found', details: [] },
      })
    }
    return reply.status(200).send(toRegistrationDto(updated, await getSurveyAnswers(updated)))
  })

  fastify.post('/api/registrations/:id/cancel', { preHandler: requireAuth }, async (request, reply) => {
    const params = RegistrationIdParamsSchema.safeParse(request.params)
    if (!params.success) return validationError(reply, params.error.issues, 'Invalid registration id')
    const updated = await registrationRepository.updateStatus(params.data.id, 'cancelled')
    if (!updated) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Registration not found', details: [] },
      })
    }
    return reply.status(200).send(toRegistrationDto(updated, await getSurveyAnswers(updated)))
  })

  fastify.post('/api/registrations/:id/clear-flag', { preHandler: [requireAuth, requireRoles('admin', 'staff')] }, async (request, reply) => {
    const params = RegistrationIdParamsSchema.safeParse(request.params)
    if (!params.success) return validationError(reply, params.error.issues, 'Invalid registration id')
    const updated = await registrationRepository.update(params.data.id, { flagOverride: true })
    if (!updated) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Registration not found', details: [] },
      })
    }
    const contact = await contactRepository.findById(updated.contactId)
    return reply.status(200).send(toRegistrationWithContactDto(updated, contact))
  })

  fastify.put('/api/registrations/bulk-approve', { preHandler: [requireAuth, requireRoles('admin', 'staff')] }, async (request, reply) => {
    const body = BulkApproveBodySchema.safeParse(request.body)
    if (!body.success) return validationError(reply, body.error.issues, 'Invalid bulk approve payload')
    const result = await registrationRepository.bulkApprove(body.data.ids)
    return reply.status(200).send({
      approved: result.approved,
      total: body.data.ids.length,
    })
  })
}
