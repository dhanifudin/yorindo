import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import {
  auditLogRepository,
  contactRepository,
  eventRepository,
  registrationRepository,
  surveyRepository,
} from '../container.js'
import { requireAdmin, requireAuth, type JwtPayload } from '../middleware/auth.js'
import type { SurveyType } from '../types/domain.js'
import { SurveyAggregationService } from '../services/SurveyAggregationService.js'
import { validateOpenApiRequest, validateOpenApiResponse } from '../lib/openapi-contract.js'

// ─── Zod Schemas ────────────────────────────────────────────────────────────────

const EventIdParamsSchema = z.object({
  id: z.string().trim().min(1),
})

const SurveyTypeParamSchema = z.enum(['registration', 'post-event'])

const SurveySchemaInput = z.object({
  schema: z.object({
    type: z.literal('object'),
    properties: z.record(z.string(), z.any()),
  }),
  uiSchema: z.record(z.string(), z.any()).default({}),
})

const SurveyResponsesQuerySchema = z.object({
  type: SurveyTypeParamSchema.default('registration'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
})

const SurveyDownloadQuerySchema = z.object({
  type: SurveyTypeParamSchema.default('registration'),
  format: z.enum(['xlsx']).default('xlsx'),
})

// ─── Helpers ────────────────────────────────────────────────────────────────────

async function requireEventOr404(reply: FastifyReply, id: string) {
  const event = await eventRepository.findById(id)
  if (!event) {
    return reply.status(404).send({
      error: { code: 'NOT_FOUND', message: 'Event not found', details: [] },
    })
  }
  return event
}

async function requireEventAccessOr403(reply: FastifyReply, user: JwtPayload, eventId: string) {
  if (user.role === 'admin') return true
  if (user.role === 'viewer' || user.role === 'staff') return true

  return reply.status(403).send({
    error: { code: 'FORBIDDEN', message: 'Participants cannot access survey data', details: [] },
  })
}

// ─── Survey Routes Plugin ──────────────────────────────────────────────────────

export const surveysRoutes: FastifyPluginAsync = async (fastify) => {
  const aggregationService = new SurveyAggregationService()

  // ── GET /api/events/:id/survey/:type ──────────────────────────────────────
  fastify.get('/api/events/:id/survey/:type', async (request, reply) => {
    const params = EventIdParamsSchema.extend({ type: SurveyTypeParamSchema }).safeParse(request.params)
    if (!params.success) {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid parameters', details: params.error.issues },
      })
    }

    const event = await requireEventOr404(reply, params.data.id)
    if (!event) return

    const user = request.user as JwtPayload | undefined
    if (user) {
      const allowed = await requireEventAccessOr403(reply, user, params.data.id)
      if (allowed !== true) return
    }

    validateOpenApiRequest({ path: '/events/{id}/survey/{type}', method: 'get', params: params.data })

    const schema = await surveyRepository.findByEventId(params.data.id, params.data.type)

    const responseBody: Record<string, unknown> = schema
      ? { schema: schema.schema ?? {}, uiSchema: schema.uiSchema ?? {} }
      : { schema: { type: 'object' as const, properties: {} }, uiSchema: {} }

    if (params.data.type === 'post-event') {
      const fullEvent = await eventRepository.findById(params.data.id)
      responseBody.enabled = fullEvent?.postSurveyEnabled ?? true
    }

    validateOpenApiResponse({ path: '/events/{id}/survey/{type}', method: 'get', status: 200, body: responseBody })
    return reply.status(200).send(responseBody)
  })

  // ── PUT /api/events/:id/survey/:type (admin only) ─────────────────────────
  fastify.put('/api/events/:id/survey/:type', { preHandler: [requireAuth, requireAdmin] }, async (request, reply) => {
    const params = EventIdParamsSchema.extend({ type: SurveyTypeParamSchema }).safeParse(request.params)
    const body = SurveySchemaInput.safeParse(request.body)

    if (!params.success || !body.success) {
      const issues = [
        ...(params.success ? [] : params.error.issues),
        ...(body.success ? [] : body.error.issues),
      ]
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid survey schema payload', details: issues },
      })
    }

    const event = await requireEventOr404(reply, params.data.id)
    if (!event) return

    validateOpenApiRequest({ path: '/events/{id}/survey/{type}', method: 'put', params: params.data, body: body.data })

    const existing = await surveyRepository.findByEventId(params.data.id, params.data.type)
    const savedSurvey = await surveyRepository.upsert(params.data.id, params.data.type, {
      id: existing?.id ?? `${params.data.id}-survey-${params.data.type}`,
      eventId: params.data.id,
      type: params.data.type,
      fields: existing?.fields ?? [],
      schema: body.data.schema,
      uiSchema: body.data.uiSchema,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    if (params.data.type === 'post-event') {
      await eventRepository.update(params.data.id, { postSurveyEnabled: true })
    }

    await auditLogRepository.create({
      action: `survey.${params.data.type}.updated`,
      actorId: (request.user as JwtPayload)?.sub ?? null,
      actorRole: 'admin',
      eventId: params.data.id,
      targetId: savedSurvey.id,
      targetType: 'survey_schema',
      metadata: { type: params.data.type },
    })

    const responseBody = {
      schema: savedSurvey.schema ?? {},
      uiSchema: savedSurvey.uiSchema ?? {},
    }

    validateOpenApiResponse({ path: '/events/{id}/survey/{type}', method: 'put', status: 200, body: responseBody })
    return reply.status(200).send(responseBody)
  })

  // ── GET /api/events/:id/survey/responses ──────────────────────────────────
  fastify.get('/api/events/:id/survey/responses', { preHandler: [requireAuth] }, async (request, reply) => {
    const params = EventIdParamsSchema.safeParse(request.params)
    const query = SurveyResponsesQuerySchema.safeParse(request.query)

    if (!params.success || !query.success) {
      const issues = [
        ...(params.success ? [] : params.error.issues),
        ...(query.success ? [] : query.error.issues),
      ]
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid parameters', details: issues },
      })
    }

    const event = await requireEventOr404(reply, params.data.id)
    if (!event) return

    const user = request.user as JwtPayload
    const allowed = await requireEventAccessOr403(reply, user, params.data.id)
    if (allowed !== true) return

    const schema = await surveyRepository.findByEventId(params.data.id, query.data.type)

    const { responses, total } = await surveyRepository.getResponsesByEvent(
      params.data.id,
      query.data.type,
      query.data.page,
      query.data.pageSize,
      query.data.search,
    )

    const allResponses = await surveyRepository.getResponsesByEvent(
      params.data.id,
      query.data.type,
    )
    const aggregates = aggregationService.aggregate(allResponses.responses, schema)

    const inMemoryRepo = surveyRepository as { getContactForRegistration?: (regId: string) => { name: string; phone: string } | null }
    const enrichedResponses = responses.map((r) => {
      const contact = inMemoryRepo.getContactForRegistration?.(r.registrationId)
      return {
        id: r.id,
        registrationId: r.registrationId,
        contactName: contact?.name ?? 'Unknown',
        contactPhone: contact?.phone ?? '',
        submittedAt: r.submittedAt,
        answers: r.answers,
      }
    })

    const totalPages = Math.ceil(total / query.data.pageSize)

    const responseBody = {
      total,
      aggregates,
      responses: enrichedResponses,
      pagination: {
        page: query.data.page,
        pageSize: query.data.pageSize,
        totalPages,
      },
    }

    validateOpenApiResponse({ path: '/events/{id}/survey/responses', method: 'get', status: 200, body: responseBody })
    return reply.status(200).send(responseBody)
  })

  // ── GET /api/events/:id/survey/responses/download ─────────────────────────
  fastify.get('/api/events/:id/survey/responses/download', { preHandler: [requireAuth] }, async (request, reply) => {
    const params = EventIdParamsSchema.safeParse(request.params)
    const query = SurveyDownloadQuerySchema.safeParse(request.query)

    if (!params.success || !query.success) {
      const issues = [
        ...(params.success ? [] : params.error.issues),
        ...(query.success ? [] : query.error.issues),
      ]
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid parameters', details: issues },
      })
    }

    const event = await requireEventOr404(reply, params.data.id)
    if (!event) return

    const user = request.user as JwtPayload
    const allowed = await requireEventAccessOr403(reply, user, params.data.id)
    if (allowed !== true) return

    const schema = await surveyRepository.findByEventId(params.data.id, query.data.type)

    const { responses: allResponses } = await surveyRepository.getResponsesByEvent(
      params.data.id,
      query.data.type,
    )

    const headers = ['Name', 'Phone', 'Submitted At']
    const questionLabels: string[] = []

    if (schema?.schema?.properties) {
      for (const [fieldId, fieldSchema] of Object.entries(schema.schema.properties as Record<string, Record<string, unknown>>)) {
        const label = (fieldSchema.title as string) || fieldId
        questionLabels.push(label)
        headers.push(label)
      }
    }

    const inMemoryRepo = surveyRepository as { getContactForRegistration?: (regId: string) => { name: string; phone: string } | null }

    const rows: string[][] = [headers]

    for (const response of allResponses) {
      const contact = inMemoryRepo.getContactForRegistration?.(response.registrationId)
      const row = [
        contact?.name ?? 'Unknown',
        contact?.phone ?? '',
        response.submittedAt,
      ]

      if (schema?.schema?.properties) {
        for (const fieldId of Object.keys(schema.schema.properties)) {
          const val = response.answers[fieldId]
          row.push(typeof val === 'object' ? JSON.stringify(val) : String(val ?? ''))
        }
      }

      rows.push(row)
    }

    const csvContent = rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n')

    reply.header('Content-Type', 'text/csv; charset=utf-8')
    reply.header('Content-Disposition', `attachment; filename="survey-responses-${query.data.type}-${params.data.id}.csv"`)

    return reply.status(200).send(csvContent)
  })
}
