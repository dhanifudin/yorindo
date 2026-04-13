import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { contactRepository, eventRepository, registrationRepository, userRepository } from '../container.js'
import { requireAuth, requireRoles } from '../middleware/auth.js'
import type { JwtPayload } from '../middleware/auth.js'
import { validateOpenApiRequest, validateOpenApiResponse } from '../lib/openapi-contract.js'

const ScanVerifyBodySchema = z.object({
  token: z.string().trim().min(1),
})

const ManualCheckinBodySchema = z.object({
  registrationId: z.string().trim().min(1),
})

/** Helper: check if non-admin user is assigned to the registration's event */
async function checkEventAccess(user: JwtPayload | undefined, registrationEventId: string): Promise<boolean> {
  if (!user || user.role === 'admin') return true
  const assignedEventIds = await userRepository.getAssignedEvents(user.sub)
  return assignedEventIds.includes(registrationEventId)
}

/** Helper: build success/already-attended response */
function buildScanResponse(
  registration: { id: string; contactId: string; eventId: string; status: string; attendedAt: string | null },
  contact: { name: string } | null,
  event: { name: string } | null,
  status: 'success' | 'already_attended',
) {
  return {
    status,
    registration: {
      id: registration.id,
      contactName: contact?.name ?? 'Unknown Contact',
      eventName: event?.name ?? 'Unknown Event',
    },
    message: status === 'success' ? 'Attendance recorded successfully' : 'Participant already checked in',
    attendedAt: registration.attendedAt ?? new Date().toISOString(),
  }
}

export const scanRoutes: FastifyPluginAsync = async (fastify) => {
  // ─── QR scan: verify ticket token ──────────────────────────────────────────
  fastify.post('/api/scan/verify', { preHandler: [requireAuth, requireRoles('admin', 'staff')] }, async (request, reply) => {
    const parsed = ScanVerifyBodySchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid scan payload', details: parsed.error.issues },
      })
    }
    validateOpenApiRequest({ path: '/scan/verify', method: 'post', body: parsed.data })

    const registration = await registrationRepository.findByTicketToken(parsed.data.token)
    if (!registration) {
      return reply.status(422).send({
        error: {
          code: 'INVALID_TICKET',
          message: 'Ticket token invalid or expired',
          details: [],
        },
      })
    }

    const user = request.user as JwtPayload | undefined
    if (!await checkEventAccess(user, registration.eventId)) {
      return reply.status(403).send({
        error: { code: 'EVENT_ACCESS_DENIED', message: 'You are not assigned to this event', details: [] },
      })
    }

    const contact = await contactRepository.findById(registration.contactId)
    const event = await eventRepository.findById(registration.eventId)

    if (registration.status === 'attended') {
      const responseBody = buildScanResponse(registration, contact, event, 'already_attended')
      validateOpenApiResponse({ path: '/scan/verify', method: 'post', status: 200, body: responseBody })
      return reply.status(200).send(responseBody)
    }

    const updated = await registrationRepository.updateStatus(registration.id, 'attended')

    const responseBody = buildScanResponse(updated ?? registration, contact, event, 'success')
    validateOpenApiResponse({ path: '/scan/verify', method: 'post', status: 200, body: responseBody })
    return reply.status(200).send(responseBody)
  })

  // ─── Manual check-in: by registration ID ───────────────────────────────────
  fastify.post('/api/scan/manual-checkin', { preHandler: [requireAuth, requireRoles('admin', 'staff')] }, async (request, reply) => {
    const parsed = ManualCheckinBodySchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid payload', details: parsed.error.issues },
      })
    }
    validateOpenApiRequest({ path: '/scan/manual-checkin', method: 'post', body: parsed.data })

    const registration = await registrationRepository.findById(parsed.data.registrationId)
    if (!registration) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Registration not found', details: [] },
      })
    }

    const user = request.user as JwtPayload | undefined
    if (!await checkEventAccess(user, registration.eventId)) {
      return reply.status(403).send({
        error: { code: 'EVENT_ACCESS_DENIED', message: 'You are not assigned to this event', details: [] },
      })
    }

    const contact = await contactRepository.findById(registration.contactId)
    const event = await eventRepository.findById(registration.eventId)

    if (registration.status === 'attended') {
      const responseBody = buildScanResponse(registration, contact, event, 'already_attended')
      validateOpenApiResponse({ path: '/scan/manual-checkin', method: 'post', status: 200, body: responseBody })
      return reply.status(200).send(responseBody)
    }

    const updated = await registrationRepository.updateStatus(registration.id, 'attended')

    const responseBody = buildScanResponse(updated ?? registration, contact, event, 'success')
    validateOpenApiResponse({ path: '/scan/manual-checkin', method: 'post', status: 200, body: responseBody })
    return reply.status(200).send(responseBody)
  })
}
