import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { registrationRepository, contactRepository, eventRepository } from '../container.js'

export const ticketsRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/tickets/:token — public ticket verification (no auth required)
  fastify.get('/api/tickets/:token', async (request, reply) => {
    const params = z.object({ token: z.string().min(1) }).safeParse(request.params)
    if (!params.success) {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid ticket token', details: [] },
      })
    }

    // Find registration by ticket token
    const registration = await registrationRepository.findByTicketToken(params.data.token)
    if (!registration) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Ticket not found', details: [] },
      })
    }

    const contact = await contactRepository.findById(registration.contactId)
    const event = await eventRepository.findById(registration.eventId)

    if (!contact || !event) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Ticket data incomplete', details: [] },
      })
    }

    // Generate QR payload (contains ticket token for scanning)
    const qrPayload = JSON.stringify({
      t: registration.ticketToken,
      e: event.id,
      n: contact.name,
    })

    return reply.status(200).send({
      token: registration.ticketToken,
      qrPayload,
      participantName: contact.name,
      eventName: event.name,
      eventDate: event.startDate,
      venue: event.venue ?? '',
    })
  })
}
