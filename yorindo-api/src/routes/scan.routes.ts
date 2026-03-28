import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { contactRepository, eventRepository, registrationRepository } from '../container.js'
import { requireAuth, requireRoles } from '../middleware/auth.js'

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

    const registration = await registrationRepository.findByTicketToken(parsed.data.token)
    if (!registration) {
      return reply.status(401).send({
        error: {
          code: 'INVALID_TICKET',
          message: 'Ticket token invalid or expired',
          details: [],
        },
      })
    }

    const contact = await contactRepository.findById(registration.contactId)
    const event = await eventRepository.findById(registration.eventId)

    if (registration.status === 'attended') {
      return reply.status(200).send({
        status: 'already_attended',
        registration: {
          id: registration.id,
          contactName: contact?.name ?? 'Unknown Contact',
          eventName: event?.name ?? 'Unknown Event',
        },
        message: 'Participant already checked in',
        attendedAt: registration.attendedAt,
      })
    }

    const updated = await registrationRepository.updateStatus(registration.id, 'attended')

    return reply.status(200).send({
      status: 'success',
      registration: {
        id: registration.id,
        contactName: contact?.name ?? 'Unknown Contact',
        eventName: event?.name ?? 'Unknown Event',
      },
      message: 'Attendance recorded successfully',
      attendedAt: updated?.attendedAt ?? new Date().toISOString(),
    })
  })
}
