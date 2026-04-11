import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import {
  auditLogRepository,
  contactRepository,
  emailService,
  eventRepository,
  registrationRepository,
  surveyRepository,
  templateRepository,
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
  secondaryEmail: z.string().email().optional(),
  phone: z.string().trim().min(8),
  company: z.string().trim().optional(),
  industry: z.string().trim().optional(),
  title: z.string().trim().optional(),
  location: z.string().trim().optional(),
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
  const { responses } = await surveyRepository.getResponsesByEvent(registration.eventId, 'registration')
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

  // Send notification email when status changes
  const newStatus = body.data.status
  const contact = await contactRepository.findById(updated.contactId)
  const event = await eventRepository.findById(updated.eventId)

  if (contact && event) {
    if (newStatus === 'approved' && contact.email) {
      // Fetch invitation ticket template from database
      const tmpl = await templateRepository.findAll()
      const ticketTmpl = tmpl.find((t) => t.type === 'ticket_delivery' && t.channel === 'email')
      const baseUrl = process.env.BASE_URL ?? 'http://localhost:3000'
      const ticketLink = updated.ticketToken ? `${baseUrl}/tickets/${updated.ticketToken}` : ''

      const variables = {
        name: contact.name,
        event_title: event.name,
        date: formatDateId(event.startDate ?? ''),
        venue: event.venue ?? event.city ?? '',
        token: updated.ticketToken ?? '',
        registration_link: ticketLink,
        registration_url: ticketLink,
        ticket_link: ticketLink,
      }

      await emailService.send({
        to: contact.email,
        subject: ticketTmpl?.subject
          ? substituteTemplateVariables(ticketTmpl.subject, variables)
          : `Tiket untuk ${event.name}`,
        body: ticketTmpl?.body
          ? substituteTemplateVariables(ticketTmpl.body, variables)
          : `<p>Halo <strong>${contact.name}</strong>, registrasi Anda untuk <strong>${event.name}</strong> telah disetujui.</p><p>Token tiket: ${updated.ticketToken}</p>`,
        templateId: ticketTmpl?.id ?? 'ticket_delivery',
        variables,
      })

      await auditLogRepository.create({
        action: 'registration.ticket_sent',
        actorId: request.user?.sub ?? null,
        actorRole: request.user?.role ?? 'admin',
        eventId: event.id,
        targetId: updated.id,
        targetType: 'registration',
        metadata: { channel: 'email', ticketToken: updated.ticketToken },
      })
    }

    if (newStatus === 'rejected' && contact.email) {
      const tmpl = await templateRepository.findAll()
      const rejectionTmpl = tmpl.find((t) => t.type === 'rejection' && t.channel === 'email')

      const variables = {
        name: contact.name,
        event_title: event.name,
        date: formatDateId(event.startDate ?? ''),
        venue: event.venue ?? event.city ?? '',
      }

      await emailService.send({
        to: contact.email,
        subject: rejectionTmpl?.subject
          ? substituteTemplateVariables(rejectionTmpl.subject, variables)
          : `Status Registrasi - ${event.name}`,
        body: rejectionTmpl?.body
          ? substituteTemplateVariables(rejectionTmpl.body, variables)
          : `<p>Maaf <strong>${contact.name}</strong>, registrasi Anda untuk <strong>${event.name}</strong> tidak dapat kami terima.</p>`,
        templateId: rejectionTmpl?.id ?? 'rejection',
        variables,
      })

      await auditLogRepository.create({
        action: 'registration.rejected',
        actorId: request.user?.sub ?? null,
        actorRole: request.user?.role ?? 'admin',
        eventId: event.id,
        targetId: updated.id,
        targetType: 'registration',
        metadata: { channel: 'email' },
      })
    }
  }

  const responseBody = {
    ...(await buildRegistrationWithContact(updated)),
    surveyAnswers: await getSurveyAnswers(updated),
  }
  validateOpenApiResponse({ path: '/registrations/{id}/status', method, status: 200, body: responseBody })
  return reply.status(200).send(responseBody)
}

/** Format ISO date to Indonesian locale */
function formatDateId(value: string): string {
  if (!value) return ''
  try {
    const d = new Date(value)
    if (isNaN(d.getTime())) return value
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
  } catch {
    return value
  }
}

/** Substitute {{variable}} placeholders with values */
function substituteTemplateVariables(template: string, data: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] ?? `{{${key}}}`)
}

export const registrationsRoutes: FastifyPluginAsync = async (fastify) => {

  // ── GET /api/locations/cities (unauthenticated — used by registration form)
  fastify.get('/api/locations/cities', async (_request, reply) => {
    const raw = readFileSync(path.resolve(process.cwd(), 'src/data/wilayah-static.json'), 'utf8')
    const data = JSON.parse(raw) as Array<{
      provinceCode: string
      provinceName: string
      cityCode: string
      cityName: string
    }>
    const cities = data.map((c) => ({
      value: c.cityName,
      label: `${c.cityName}, ${c.provinceName}`,
      provinceCode: c.provinceCode,
      cityCode: c.cityCode,
    }))
    validateOpenApiResponse({ path: '/locations/cities', method: 'get', status: 200, body: { data: cities } })
    return reply.status(200).send({ data: cities })
  })

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
      ? await contactRepository.update(existingContact.id, { 
          name: payload.name, 
          email: payload.email,
          serviceType: payload.industry ?? existingContact.serviceType,
          company: payload.company ?? existingContact.company,
          jobTitle: payload.title ?? existingContact.jobTitle,
          city: payload.location ?? existingContact.city,
        })
      : await contactRepository.upsert({
          name: payload.name,
          phone: payload.phone,
          email: payload.email,
          serviceType: payload.industry ?? null,
          jobTitle: payload.title ?? null,
          city: payload.location ?? null,
          provinceCode: null,
          provinceName: null,
          cityCode: null,
          cityName: null,
          company: payload.company ?? null,
          department: null,
          eventDate: null,
          topicTags: null,
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
      await surveyRepository.saveResponse(registration.id, registration.eventId, 'registration', payload.surveyAnswers)
    }

    const responseBody = toRegistrationDto(registration, payload.surveyAnswers ?? {})
    validateOpenApiResponse({ path: '/registrations', method: 'post', status: 201, body: responseBody })
    return reply.status(201).send(responseBody)
  })

  // ── GET /api/registrations/confirm/:token (unauthenticated — email confirmation link)
  fastify.get('/api/registrations/confirm/:token', async (request, reply) => {
    const { token } = request.params as { token: string }
    const registration = await registrationRepository.findByTicketToken(token)
    if (!registration) {
      return reply.status(400).send({
        error: { code: 'INVALID_TOKEN', message: 'Token tidak valid atau sudah kadaluarsa', details: [] },
      })
    }
    const event = await eventRepository.findById(registration.eventId)
    if (!event) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Event not found', details: [] },
      })
    }
    const contact = await contactRepository.findById(registration.contactId)
    return reply.status(200).send({
      message: 'Registrasi berhasil dikonfirmasi',
      registration: {
        id: registration.id,
        status: registration.status,
        eventName: event.name,
        eventSlug: event.slug,
        eventDate: event.startDate,
        participantName: contact?.name ?? registration.contactId,
        contactId: registration.contactId,
        participantEmail: contact?.email ?? '',
      },
    })
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
          message: 'Ticket resend is only available for approved registrations',
          details: [{ status: registration.status }],
        },
      })
    }

    // Generate ticket token if not exists
    let ticketToken = registration.ticketToken
    if (!ticketToken) {
      const { createId } = await import('@paralleldrive/cuid2')
      ticketToken = `ticket-${createId()}`
      await registrationRepository.update(params.data.id, { ticketToken })
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

    // Fetch ticket template from database
    const tmpl = await templateRepository.findAll()
    const ticketTmpl = tmpl.find((t) => t.type === 'ticket_delivery' && t.channel === 'email')

    const baseUrl = process.env.BASE_URL ?? 'http://localhost:3000'
    const ticketLink = `${baseUrl}/tickets/${ticketToken}`

    const formatDateId = (value: string): string => {
      if (!value) return ''
      try {
        const d = new Date(value)
        if (isNaN(d.getTime())) return value
        return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
      } catch {
        return value
      }
    }

    const substituteTemplateVariables = (template: string, data: Record<string, string>): string => {
      return template.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] ?? `{{${key}}}`)
    }

    const variables = {
      name: contact.name,
      event_title: event.name,
      date: formatDateId(event.startDate ?? ''),
      venue: event.venue ?? event.city ?? '',
      token: ticketToken,
      registration_link: ticketLink,
      registration_url: ticketLink,
      ticket_link: ticketLink,
    }

    const resentAt = new Date().toISOString()

    await emailService.send({
      to: contact.email ?? '',
      subject: ticketTmpl?.subject
        ? substituteTemplateVariables(ticketTmpl.subject, variables)
        : `Tiket untuk ${event.name}`,
      body: ticketTmpl?.body
        ? substituteTemplateVariables(ticketTmpl.body, variables)
        : `<p>Halo <strong>${contact.name}</strong>, berikut tiket Anda untuk <strong>${event.name}</strong>.</p><p>Token: ${ticketToken}</p>`,
      templateId: ticketTmpl?.id ?? 'ticket_delivery',
      variables,
    })

    await auditLogRepository.create({
      action: 'registration.ticket_resent',
      actorId: request.user?.sub ?? null,
      actorRole: request.user?.role ?? 'admin',
      eventId: event.id,
      targetId: registration.id,
      targetType: 'registration',
      metadata: { channel: 'email', ticketToken },
    })

    const responseBody = {
      accepted: true,
      registrationId: registration.id,
      channel: 'email',
      resentAt,
    }
    return reply.status(202).send(responseBody)
  })

  const bulkApproveRegistrationsHandler = async (request: FastifyRequest, reply: FastifyReply) => {
    const body = BulkApproveBodySchema.safeParse(request.body)
    if (!body.success) return validationError(reply, body.error.issues, 'Invalid bulk approve payload')
    validateOpenApiRequest({ path: '/registrations/bulk-approve', method: 'put', body: body.data })

    // Fetch registrations before approval to get contact/event info
    const registrations = await Promise.all(body.data.ids.map((id) => registrationRepository.findById(id)))
    const validRegistrations = registrations.filter((r): r is NonNullable<typeof r> => r !== null)

    const result = await registrationRepository.bulkApprove(body.data.ids)

    // Send ticket emails for all approved registrations
    const tmpl = await templateRepository.findAll()
    const ticketTmpl = tmpl.find((t) => t.type === 'ticket_delivery' && t.channel === 'email')

    for (const reg of validRegistrations) {
      try {
        const contact = await contactRepository.findById(reg.contactId)
        const event = await eventRepository.findById(reg.eventId)
        if (!contact?.email || !event) continue

        const baseUrl = process.env.BASE_URL ?? 'http://localhost:3000'
        const ticketLink = reg.ticketToken ? `${baseUrl}/tickets/${reg.ticketToken}` : ''

        const variables = {
          name: contact.name,
          event_title: event.name,
          date: formatDateId(event.startDate ?? ''),
          venue: event.venue ?? event.city ?? '',
          token: reg.ticketToken ?? '',
          registration_link: ticketLink,
          registration_url: ticketLink,
          ticket_link: ticketLink,
        }

        await emailService.send({
          to: contact.email,
          subject: ticketTmpl?.subject
            ? substituteTemplateVariables(ticketTmpl.subject, variables)
            : `Tiket untuk ${event.name}`,
          body: ticketTmpl?.body
            ? substituteTemplateVariables(ticketTmpl.body, variables)
            : `<p>Halo <strong>${contact.name}</strong>, registrasi Anda untuk <strong>${event.name}</strong> telah disetujui.</p><p>Token tiket: ${reg.ticketToken}</p>`,
          templateId: ticketTmpl?.id ?? 'ticket_delivery',
          variables,
        })

        await auditLogRepository.create({
          action: 'registration.ticket_sent',
          actorId: request.user?.sub ?? null,
          actorRole: request.user?.role ?? 'admin',
          eventId: event.id,
          targetId: reg.id,
          targetType: 'registration',
          metadata: { channel: 'email', ticketToken: reg.ticketToken },
        })
      } catch {
        // Log error but don't fail the whole bulk operation
      }
    }

    const responseBody = {
      approved: result.approved,
      total: body.data.ids.length,
    }
    validateOpenApiResponse({ path: '/registrations/bulk-approve', method: 'put', status: 200, body: responseBody })
    return reply.status(200).send(responseBody)
  }

  const bulkRejectRegistrationsHandler = async (request: FastifyRequest, reply: FastifyReply) => {
    const body = BulkApproveBodySchema.safeParse(request.body)
    if (!body.success) return validationError(reply, body.error.issues, 'Invalid bulk reject payload')
    validateOpenApiRequest({ path: '/registrations/bulk-reject', method: 'put', body: body.data })

    // Fetch registrations before rejection to get contact/event info
    const registrations = await Promise.all(body.data.ids.map((id) => registrationRepository.findById(id)))
    const validRegistrations = registrations.filter((r): r is NonNullable<typeof r> => r !== null)

    // Reject all
    let rejected = 0
    for (const reg of validRegistrations) {
      const updated = await registrationRepository.updateStatus(reg.id, 'rejected')
      if (updated) rejected++
    }

    // Send rejection emails
    const tmpl = await templateRepository.findAll()
    const rejectionTmpl = tmpl.find((t) => t.type === 'rejection' && t.channel === 'email')

    for (const reg of validRegistrations) {
      try {
        const contact = await contactRepository.findById(reg.contactId)
        const event = await eventRepository.findById(reg.eventId)
        if (!contact?.email || !event) continue

        const variables = {
          name: contact.name,
          event_title: event.name,
          date: formatDateId(event.startDate ?? ''),
          venue: event.venue ?? event.city ?? '',
        }

        await emailService.send({
          to: contact.email,
          subject: rejectionTmpl?.subject
            ? substituteTemplateVariables(rejectionTmpl.subject, variables)
            : `Status Registrasi - ${event.name}`,
          body: rejectionTmpl?.body
            ? substituteTemplateVariables(rejectionTmpl.body, variables)
            : `<p>Maaf <strong>${contact.name}</strong>, registrasi Anda untuk <strong>${event.name}</strong> tidak dapat kami terima.</p>`,
          templateId: rejectionTmpl?.id ?? 'rejection',
          variables,
        })

        await auditLogRepository.create({
          action: 'registration.rejected',
          actorId: request.user?.sub ?? null,
          actorRole: request.user?.role ?? 'admin',
          eventId: event.id,
          targetId: reg.id,
          targetType: 'registration',
          metadata: { channel: 'email' },
        })
      } catch {
        // Log error but don't fail the whole bulk operation
      }
    }

    const responseBody = {
      rejected,
      total: body.data.ids.length,
    }
    validateOpenApiResponse({ path: '/registrations/bulk-reject', method: 'put', status: 200, body: responseBody })
    return reply.status(200).send(responseBody)
  }

  fastify.put('/api/registrations/bulk-approve', { preHandler: [requireAuth, requireRoles('admin', 'staff')] }, bulkApproveRegistrationsHandler)
  fastify.patch('/api/registrations/bulk-approve', { preHandler: [requireAuth, requireRoles('admin', 'staff')] }, bulkApproveRegistrationsHandler)
  fastify.put('/api/registrations/bulk-reject', { preHandler: [requireAuth, requireRoles('admin', 'staff')] }, bulkRejectRegistrationsHandler)
  fastify.patch('/api/registrations/bulk-reject', { preHandler: [requireAuth, requireRoles('admin', 'staff')] }, bulkRejectRegistrationsHandler)
}
