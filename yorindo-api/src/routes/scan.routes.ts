import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { contactRepository, eventRepository, registrationRepository, userRepository } from '../container.js'
import { requireAuth, requireRoles } from '../middleware/auth.js'
import type { JwtPayload } from '../middleware/auth.js'
import { validateOpenApiRequest, validateOpenApiResponse } from '../lib/openapi-contract.js'

const ScanVerifyBodySchema = z.object({
  token: z.string().trim().min(1),
})

export const scanRoutes: FastifyPluginAsync = async (fastify) => {
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
    if (user && user.role !== 'admin') {
      const assignedEventIds = await userRepository.getAssignedEvents(user.sub)
      if (!assignedEventIds.includes(registration.eventId)) {
        return reply.status(403).send({
          error: {
            code: 'EVENT_ACCESS_DENIED',
            message: 'You are not assigned to this event',
            details: [],
          },
        })
      }
    }

    const contact = await contactRepository.findById(registration.contactId)
    const event = await eventRepository.findById(registration.eventId)

    if (registration.status === 'attended') {
      const responseBody = {
        status: 'already_attended',
        registration: {
          id: registration.id,
          contactName: contact?.name ?? 'Unknown Contact',
          eventName: event?.name ?? 'Unknown Event',
        },
        message: 'Participant already checked in',
        attendedAt: registration.attendedAt,
      }
      validateOpenApiResponse({ path: '/scan/verify', method: 'post', status: 200, body: responseBody })
      return reply.status(200).send(responseBody)
    }

    const updated = await registrationRepository.updateStatus(registration.id, 'attended')

    const responseBody = {
      status: 'success',
      registration: {
        id: registration.id,
        contactName: contact?.name ?? 'Unknown Contact',
        eventName: event?.name ?? 'Unknown Event',
      },
      message: 'Attendance recorded successfully',
      attendedAt: updated?.attendedAt ?? new Date().toISOString(),
    }
    validateOpenApiResponse({ path: '/scan/verify', method: 'post', status: 200, body: responseBody })
    return reply.status(200).send(responseBody)
  })
}
