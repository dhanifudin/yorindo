import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { auditLogRepository, contactRepository, eventRepository, flaggedRecordsRepository, queueService, registrationRepository, suppressionRepository, getNormalizationService } from '../container.js'
import { requireAdmin, requireAuth, type JwtPayload } from '../middleware/auth.js'
import type { Contact, DuplicatePair, FlaggedRecord, FlaggedRecordStatus, RegistrationStatus, SuppressionRecord } from '../types/domain.js'
import { INDONESIAN_INDUSTRIES } from '../repositories/memory/_seeds.js'
import { validateOpenApiRequest, validateOpenApiResponse } from '../lib/openapi-contract.js'

// Constants removed

const ContactsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  serviceType: z.string().trim().optional(),
  city: z.string().trim().optional(),
  jobTitle: z.string().trim().optional(),
  flagFilter: z.enum(['flagged', 'unflagged']).optional(),
  missingEmail: z.coerce.boolean().optional(),
  missingPhone: z.coerce.boolean().optional(),
  q: z.string().trim().optional(),
  sortBy: z.string().trim().optional(),
  sortDir: z.enum(['asc', 'desc']).optional(),
})

const IndustrySuggestionsQuerySchema = z.object({
  q: z.string().trim().default(''),
})

const DuplicatesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
})

const FlaggedQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['pending', 'resolved', 'discarded', 'all']).optional(),
})

const SuppressionQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().optional(),
})

const MergeParamsSchema = z.object({
  id: z.string().trim().min(1),
})

const FlaggedParamsSchema = z.object({
  id: z.string().trim().min(1),
})

const SuppressionParamsSchema = z.object({
  id: z.string().trim().min(1),
})

const MergeBodySchema = z.object({
  mergeIntoId: z.string().trim().optional(),
  fieldSelections: z.record(z.enum(['primary', 'duplicate'])).optional(),
}).optional()

const FlaggedResolutionBodySchema = z.object({
  action: z.enum(['approve', 'discard']),
  data: z.object({
    name: z.string().trim().min(1).optional(),
    phone: z.string().trim().regex(/^\+62\d{8,13}$/).optional(),
    email: z.string().trim().email().nullable().optional(),
    city: z.string().trim().nullable().optional(),
    company: z.string().trim().nullable().optional(),
    department: z.string().trim().nullable().optional(),
    serviceType: z.string().trim().nullable().optional(),
    jobTitle: z.string().trim().nullable().optional(),
    eventDate: z.string().trim().nullable().optional(),
  }).optional(),
})

const AddSuppressionBodySchema = z.object({
  email: z.string().trim().email().optional(),
  phone: z.string().trim().min(8).optional(),
  reason: z.enum(['unsubscribed', 'erasure_request', 'manually_added']).default('manually_added'),
}).superRefine((value, ctx) => {
  if (!value.email && !value.phone) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['email'],
      message: 'email or phone is required',
    })
  }
})

type ContactsQuery = z.infer<typeof ContactsQuerySchema>

/**
 * Menormalkan teks bebas agar pencocokan industri lebih konsisten.
 */
function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Memberi skor sederhana untuk kecocokan query bebas dengan slug industri canonical.
 */
function scoreIndustryMatch(query: string, slug: string, label: string): number {
  const q = normalizeText(query)
  const s = normalizeText(slug)
  const l = normalizeText(label)
  if (!q) return 0
  if (q === s || q === l) return 0.95
  if (s.includes(q) || l.includes(q)) return 0.85

  const tokens = q.split(' ').filter(Boolean)
  if (tokens.length === 0) return 0

  const matchedTokens = tokens.filter((token) => s.includes(token) || l.includes(token)).length
  if (matchedTokens === 0) return 0

  return Math.min(0.8, 0.45 + (matchedTokens / tokens.length) * 0.3)
}

function toNullableText(value: unknown): string | null {
  if (value === null || value === undefined) return null
  const normalized = String(value).trim()
  return normalized ? normalized : null
}

function normalizeApprovedEmail(value: unknown): string | null {
  const email = toNullableText(value)?.toLowerCase() ?? null
  if (!email) return null
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null
}

/**
 * Menormalkan alias sort FE ke nama field repository yang didukung.
 */
function toSortBy(sortBy?: string): string | undefined {
  if (!sortBy) return undefined
  if (sortBy === 'industry') return 'industryId'
  if (sortBy === 'created_at') return 'createdAt'
  return sortBy
}

// Mengubah filter flag FE ke filter repository yang setara.
function toFlagFilter(flagFilter?: 'flagged' | 'unflagged') {
  if (!flagFilter) return {}
  if (flagFilter === 'flagged') return { flagCategory: 'ANY' }
  return { flagCategory: 'NONE' }
}

/**
 * Mengubah hasil facet repository ke shape slug/label/count yang dipakai FE.
 */
function toFacetsDto(facets: Awaited<ReturnType<typeof contactRepository.findFacets>>) {
  return {
    serviceType: facets.serviceType.map((item) => ({
      slug: item.slug,
      label: item.label,
      count: item.count,
    })),
    city: facets.city.map((item) => ({
      slug: item.slug,
      label: item.label,
      count: item.count,
    })),
  }
}

/**
 * Membentuk DTO kontak agar kontrak respons lebih cocok dengan kebutuhan FE.
 */
function toContactDto(contact: Contact) {
  return {
    id: contact.id,
    name: contact.name,
    email: contact.email,
    phone: contact.phone,
    company: contact.company ?? '',
    serviceType: contact.serviceType ?? null,
    jobTitle: contact.jobTitle ?? null,
    department: contact.department ?? null,
    city: contact.city ?? '',
    eventDate: contact.eventDate ?? null,
    completenessScore: contact.completenessScore,
    consentStatus: contact.consentStatus,
    flagCategory: contact.flagCategory,
    createdAt: contact.createdAt,
    updatedAt: contact.updatedAt,
  }
}

/**
 * Membentuk DTO pasangan duplikat agar FE bisa menampilkan perbandingan record.
 */
function toDuplicatePairDto(pair: DuplicatePair) {
  return {
    id: pair.id,
    primary: toContactDto(pair.primary),
    duplicate: toContactDto(pair.duplicate),
    matchScore: pair.matchScore,
    matchReasons: pair.matchReasons,
  }
}

/**
 * Membentuk item riwayat event dari pasangan registration dan event yang cocok.
 */
function toContactHistoryEntry(
  registration: { eventId: string; status: RegistrationStatus },
  event: { id: string; name: string; date: string },
) {
  return {
    eventId: event.id,
    eventName: event.name,
    eventDate: event.date,
    status: registration.status,
  }
}

function getSuggestedData(record: FlaggedRecord): Record<string, unknown> {
  const rawData = record.rawData ?? {}
  const normalized = typeof rawData === 'object' && rawData !== null && typeof rawData['normalized'] === 'object' && rawData['normalized'] !== null
    ? rawData['normalized'] as Record<string, unknown>
    : {}

  return {
    name: toNullableText(normalized.name ?? rawData['name']) ?? '',
    phone: toNullableText(normalized.phone ?? rawData['phone']) ?? '',
    email: normalizeApprovedEmail(normalized.email ?? rawData['email']),
    city: toNullableText(normalized.city ?? rawData['city']),
    company: toNullableText(normalized.company ?? rawData['company']),
    department: toNullableText(normalized.department ?? rawData['department']),
    serviceType: toNullableText(normalized.serviceType ?? rawData['serviceType']),
    jobTitle: toNullableText(normalized.jobTitle ?? rawData['jobTitle']),
    eventDate: toNullableText(normalized.eventDate ?? rawData['eventDate']),
  }
}

function toFlaggedRecordDto(record: FlaggedRecord) {
  return {
    id: record.id,
    rawData: record.rawData,
    suggestedData: getSuggestedData(record),
    reason: record.flags.join(', '),
    status: record.status,
    flags: record.flags,
    uploadId: record.uploadId,
    resolvedBy: record.resolvedBy,
    resolvedAt: record.resolvedAt,
    createdAt: record.createdAt,
  }
}

function computeApprovalCompleteness(input: {
  name: string
  phone: string
  email: string | null
  company: string | null
  serviceType: string | null
  jobTitle: string | null
  department: string | null
  city: string | null
}): number {
  const fields = [
    input.name,
    input.phone,
    input.email,
    input.company,
    input.serviceType,
    input.jobTitle,
    input.department,
    input.city,
  ]
  const filled = fields.filter((field) => field !== null && field !== undefined && field !== '').length
  return Math.round((filled / fields.length) * 1000) / 1000
}

async function findContactByEmailOrPhone(email?: string, phone?: string) {
  if (phone) {
    const byPhone = await contactRepository.findByPhone(phone)
    if (byPhone) return byPhone
  }

  if (email) {
    const { data } = await contactRepository.findAll({ page: 1, pageSize: 1000 })
    const normalizedEmail = email.toLowerCase()
    return data.find((contact) => (contact.email ?? '').toLowerCase() === normalizedEmail) ?? null
  }

  return null
}

async function toSuppressionDto(record: Awaited<ReturnType<typeof suppressionRepository.findAll>>['data'][number]) {
  const linkedContact = await contactRepository.findById(record.contactId)
  return {
    id: record.id,
    name: linkedContact?.name ?? record.name ?? '',
    email: linkedContact?.email ?? record.email ?? '',
    phone: linkedContact?.phone ?? record.phone ?? '',
    suppressedAt: record.createdAt,
    reason: record.reason,
  }
}

export const contactRoutes: FastifyPluginAsync = async (fastify) => {
  const adminOnly = { preHandler: [requireAuth, requireAdmin] }

  fastify.get('/api/contacts/health', adminOnly, async (_request, reply) => {
    const health = await contactRepository.countHealth()

    const responseBody = {
      flagged: health.flagged,
      duplicates: health.duplicates,
      missingEmail: health.missingEmail,
      missingPhone: health.missingPhone,
    }
    validateOpenApiResponse({ path: '/contacts/health', method: 'get', status: 200, body: responseBody })
    return reply.status(200).send(responseBody)
  })

  fastify.get('/api/contacts/facets', adminOnly, async (_request, reply) => {
    const responseBody = toFacetsDto(await contactRepository.findFacets())
    validateOpenApiResponse({ path: '/contacts/facets', method: 'get', status: 200, body: responseBody })
    return reply.status(200).send(responseBody)
  })

  fastify.get('/api/contacts', adminOnly, async (request, reply) => {
    const result = ContactsQuerySchema.safeParse(request.query)
    if (!result.success) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid query params',
          details: result.error.issues,
        },
      })
    }

    const query: ContactsQuery = result.data
    validateOpenApiRequest({ path: '/contacts', method: 'get', query })
    const paginationParams = {
      page: query.page,
      pageSize: query.pageSize,
    } as {
      page: number
      pageSize: number
      sortBy?: string
      sortDir?: 'asc' | 'desc'
    }
    const filters = {} as {
      serviceType?: string
      city?: string
      jobTitle?: string
      missingEmail?: boolean
      missingPhone?: boolean
      flagCategory?: string
      search?: string
    }

    const sortBy = toSortBy(query.sortBy)
    const flagFilter = toFlagFilter(query.flagFilter)
    if (sortBy) paginationParams.sortBy = sortBy
    if (query.sortDir) paginationParams.sortDir = query.sortDir
    if (query.serviceType) filters.serviceType = query.serviceType
    if (query.city) filters.city = query.city
    if (query.jobTitle) filters.jobTitle = query.jobTitle
    if (query.missingEmail) filters.missingEmail = true
    if (query.missingPhone) filters.missingPhone = true
    if (query.q) filters.search = query.q
    if (flagFilter.flagCategory) filters.flagCategory = flagFilter.flagCategory

    const { data, total } = await contactRepository.findAll(
      paginationParams,
      filters,
    )

    const responseBody = {
      data: data.map(toContactDto),
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.ceil(total / query.pageSize),
      },
    }
    validateOpenApiResponse({ path: '/contacts', method: 'get', status: 200, body: responseBody })
    return reply.status(200).send(responseBody)
  })

  fastify.get('/api/contacts/suppression', adminOnly, async (request, reply) => {
    const result = SuppressionQuerySchema.safeParse(request.query)
    if (!result.success) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid suppression query params',
          details: result.error.issues,
        },
      })
    }

    const query = result.data
    validateOpenApiRequest({ path: '/contacts/suppression', method: 'get', query })

    const suppressionResult = await suppressionRepository.findAll({ page: 1, pageSize: 1000 })
    const dto = await Promise.all(suppressionResult.data.map(async (record: SuppressionRecord) => toSuppressionDto(record)))
    const filtered = query.q
      ? dto.filter((entry) => {
        const needle = query.q!.toLowerCase()
        return entry.name.toLowerCase().includes(needle)
          || entry.email.toLowerCase().includes(needle)
          || entry.phone.toLowerCase().includes(needle)
      })
      : dto

    const total = filtered.length
    const start = (query.page - 1) * query.pageSize
    const responseBody = {
      data: filtered.slice(start, start + query.pageSize),
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.ceil(total / query.pageSize),
      },
    }
    validateOpenApiResponse({ path: '/contacts/suppression', method: 'get', status: 200, body: responseBody })
    return reply.status(200).send(responseBody)
  })

  fastify.post('/api/contacts/suppression', adminOnly, async (request, reply) => {
    const result = AddSuppressionBodySchema.safeParse(request.body)
    if (!result.success) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid suppression payload',
          details: result.error.issues,
        },
      })
    }

    const payload = result.data
    validateOpenApiRequest({ path: '/contacts/suppression', method: 'post', body: payload })

    const normalizedPhone = payload.phone?.trim()
    const normalizedEmail = payload.email?.trim().toLowerCase()
    const suppressionLookup: { phone?: string | null; email?: string | null } = {}
    if (normalizedPhone) suppressionLookup.phone = normalizedPhone
    if (normalizedEmail) suppressionLookup.email = normalizedEmail
    const alreadySuppressed = await suppressionRepository.isSuppressed(suppressionLookup)
    if (alreadySuppressed) {
      return reply.status(409).send({
        error: {
          code: 'ALREADY_EXISTS',
          message: 'Contact is already suppressed',
          details: [],
        },
      })
    }

    const linkedContact = await findContactByEmailOrPhone(normalizedEmail, normalizedPhone)
    const actor = request.user as JwtPayload | undefined
    const record = await suppressionRepository.suppress(
      linkedContact?.id ?? normalizedPhone ?? normalizedEmail ?? `manual-${Date.now()}`,
      payload.reason,
      {
        phone: linkedContact?.phone ?? normalizedPhone ?? null,
        email: linkedContact?.email ?? normalizedEmail ?? null,
        name: linkedContact?.name ?? null,
      },
    )

    if (linkedContact) {
      await contactRepository.update(linkedContact.id, {
        consentStatus: 'suppressed',
      })
    }

    await auditLogRepository.create({
      action: 'contact.suppressed',
      actorId: actor?.sub ?? null,
      actorRole: actor?.role ?? 'system',
      eventId: null,
      targetId: linkedContact?.id ?? record.id,
      targetType: 'contact',
      metadata: {
        suppressionId: record.id,
        reason: payload.reason,
        phone: record.phone,
        email: record.email,
      },
    })

    const responseBody = await toSuppressionDto(record)
    validateOpenApiResponse({ path: '/contacts/suppression', method: 'post', status: 201, body: responseBody })
    return reply.status(201).send(responseBody)
  })

  fastify.delete('/api/contacts/suppression/:id', adminOnly, async (request, reply) => {
    const result = SuppressionParamsSchema.safeParse(request.params)
    if (!result.success) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid suppression id',
          details: result.error.issues,
        },
      })
    }

    validateOpenApiRequest({ path: '/contacts/suppression/{id}', method: 'delete', params: result.data })
    const suppressionResult = await suppressionRepository.findAll({ page: 1, pageSize: 1000 })
    const existing = suppressionResult.data.find((record: SuppressionRecord) => record.id === result.data.id)
    if (!existing) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Suppression entry not found', details: [] },
      })
    }

    await suppressionRepository.remove(existing.id)
    const linkedContact = await contactRepository.findById(existing.contactId)
    if (linkedContact) {
      await contactRepository.update(linkedContact.id, {
        consentStatus: 'active',
      })
    }

    const actor = request.user as JwtPayload | undefined
    await auditLogRepository.create({
      action: 'contact.unsuppressed',
      actorId: actor?.sub ?? null,
      actorRole: actor?.role ?? 'system',
      eventId: null,
      targetId: linkedContact?.id ?? existing.id,
      targetType: 'contact',
      metadata: {
        suppressionId: existing.id,
        phone: existing.phone,
        email: existing.email,
      },
    })

    return reply.status(204).send()
  })

  fastify.get('/api/contacts/industry-suggestions', adminOnly, async (request, reply) => {
    const result = IndustrySuggestionsQuerySchema.safeParse(request.query)
    if (!result.success) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid query params',
          details: result.error.issues,
        },
      })
    }
    validateOpenApiRequest({ path: '/contacts/industry-suggestions', method: 'get', query: result.data })

    const query = result.data.q
    if (!query || query.length < 2) {
      const responseBody = {
        suggestions: [],
        matchedSlug: null,
        fallback: false,
      }
      validateOpenApiResponse({ path: '/contacts/industry-suggestions', method: 'get', status: 200, body: responseBody })
      return reply.status(200).send(responseBody)
    }

    const suggestions = INDONESIAN_INDUSTRIES
      .map((industry) => ({
        slug: industry.slug,
        label: industry.name,
        confidence: Number(scoreIndustryMatch(query, industry.slug, industry.name).toFixed(2)),
      }))
      .filter((industry) => industry.confidence > 0)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5)

    const best = suggestions[0]

    const responseBody = {
      suggestions,
      matchedSlug: best && best.confidence >= 0.6 ? best.slug : null,
      fallback: !best || best.confidence < 0.6,
    }
    validateOpenApiResponse({ path: '/contacts/industry-suggestions', method: 'get', status: 200, body: responseBody })
    return reply.status(200).send(responseBody)
  })

  fastify.get('/api/contacts/duplicates', adminOnly, async (request, reply) => {
    const result = DuplicatesQuerySchema.safeParse(request.query)
    if (!result.success) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid query params',
          details: result.error.issues,
        },
      })
    }
    validateOpenApiRequest({ path: '/contacts/duplicates', method: 'get', query: result.data })

    const query = result.data
    const { data, total } = await contactRepository.findDuplicates({
      page: query.page,
      pageSize: query.pageSize,
    })

    const responseBody = {
      data: data.map(toDuplicatePairDto),
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.ceil(total / query.pageSize),
      },
    }
    validateOpenApiResponse({ path: '/contacts/duplicates', method: 'get', status: 200, body: responseBody })
    return reply.status(200).send(responseBody)
  })

  fastify.get('/api/contacts/:id/history', adminOnly, async (request, reply) => {
    const paramsResult = MergeParamsSchema.safeParse(request.params)
    if (!paramsResult.success) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid contact id',
          details: paramsResult.error.issues,
        },
      })
    }

    validateOpenApiRequest({ path: '/contacts/{id}/history', method: 'get', params: paramsResult.data })

    const contact = await contactRepository.findById(paramsResult.data.id)
    if (!contact) {
      return reply.status(404).send({
        error: {
          code: 'NOT_FOUND',
          message: 'Contact not found',
          details: [],
        },
      })
    }

    const { data: rawRegistrations } = await registrationRepository.findAll(
      { page: 1, pageSize: 50 },
      { contactId: contact.id }
    )
    const registrationsWithEvents = await Promise.all(
      rawRegistrations.map(async (reg) => {
        const event = await eventRepository.findById(reg.eventId)
        if (!event) return null
        return toContactHistoryEntry(
          { eventId: reg.eventId, status: reg.status as RegistrationStatus },
          { id: event.id, name: event.name, date: event.startDate ?? event.createdAt }
        )
      })
    )

    const registrations = registrationsWithEvents.filter((item): item is NonNullable<typeof item> => item !== null)

    const responseBody = { registrations }
    validateOpenApiResponse({ path: '/contacts/{id}/history', method: 'get', status: 200, body: responseBody })
    return reply.status(200).send(responseBody)
  })

  fastify.delete('/api/contacts/duplicates/:id', adminOnly, async (request, reply) => {
    const paramsResult = FlaggedParamsSchema.safeParse(request.params)
    if (!paramsResult.success) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid duplicate id',
          details: paramsResult.error.issues,
        },
      })
    }

    validateOpenApiRequest({ path: '/contacts/duplicates/{id}', method: 'delete', params: paramsResult.data })

    const dismissed = await contactRepository.dismissDuplicate(paramsResult.data.id)
    if (!dismissed) {
      return reply.status(404).send({
        error: {
          code: 'NOT_FOUND',
          message: 'Duplicate pair not found',
          details: [],
        },
      })
    }

    return reply.status(204).send()
  })

  fastify.post('/api/contacts/:id/merge', adminOnly, async (request, reply) => {
    const paramsResult = MergeParamsSchema.safeParse(request.params)
    const bodyResult = MergeBodySchema.safeParse(request.body)

    if (!paramsResult.success || !bodyResult.success) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid merge payload',
          details: [
            ...(paramsResult.success ? [] : paramsResult.error.issues),
            ...(bodyResult.success ? [] : bodyResult.error.issues),
          ],
        },
      })
    }
    validateOpenApiRequest({ path: '/contacts/{id}/merge', method: 'post', params: paramsResult.data, body: bodyResult.data })

    const merged = await contactRepository.mergeDuplicate(
      paramsResult.data.id,
      bodyResult.data?.fieldSelections,
    )

    if (!merged) {
      return reply.status(404).send({
        error: {
          code: 'NOT_FOUND',
          message: 'Duplicate pair not found',
          details: [],
        },
      })
    }

    const responseBody = toContactDto(merged)
    validateOpenApiResponse({ path: '/contacts/{id}/merge', method: 'post', status: 200, body: responseBody })
    return reply.status(200).send(responseBody)
  })

  fastify.get('/api/contacts/flagged', adminOnly, async (request, reply) => {
    const result = FlaggedQuerySchema.safeParse(request.query)
    if (!result.success) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid query params',
          details: result.error.issues,
        },
      })
    }

    validateOpenApiRequest({ path: '/contacts/flagged', method: 'get', query: result.data })
    const query = result.data
    const { data, total } = await flaggedRecordsRepository.findAll(
      { page: query.page, pageSize: query.pageSize },
      query.status === 'all' ? undefined : query.status as FlaggedRecordStatus | undefined,
    )

    const responseBody = {
      data: data.map(toFlaggedRecordDto),
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.ceil(total / query.pageSize),
      },
    }
    validateOpenApiResponse({ path: '/contacts/flagged', method: 'get', status: 200, body: responseBody })
    return reply.status(200).send(responseBody)
  })

  fastify.patch('/api/contacts/flagged/:id', adminOnly, async (request, reply) => {
    const paramsResult = FlaggedParamsSchema.safeParse(request.params)
    const bodyResult = FlaggedResolutionBodySchema.safeParse(request.body)

    if (!paramsResult.success || !bodyResult.success) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid flagged record resolution payload',
          details: [
            ...(paramsResult.success ? [] : paramsResult.error.issues),
            ...(bodyResult.success ? [] : bodyResult.error.issues),
          ],
        },
      })
    }

    validateOpenApiRequest({
      path: '/contacts/flagged/{id}',
      method: 'patch',
      params: paramsResult.data,
      body: bodyResult.data,
    })

    const flaggedRecord = await flaggedRecordsRepository.findById(paramsResult.data.id)
    if (!flaggedRecord) {
      return reply.status(404).send({
        error: {
          code: 'NOT_FOUND',
          message: 'Flagged record not found',
          details: [],
        },
      })
    }

    const actor = request.user as JwtPayload

    if (bodyResult.data.action === 'discard') {
      await flaggedRecordsRepository.discard(flaggedRecord.id, actor.sub)
      const discarded = await flaggedRecordsRepository.findById(flaggedRecord.id)
      if (!discarded) {
        return reply.status(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Flagged record not found after discard',
            details: [],
          },
        })
      }

      await auditLogRepository.create({
        action: 'flagged_record.discarded',
        actorId: actor.sub,
        actorRole: actor.role,
        eventId: null,
        targetId: discarded.id,
        targetType: 'flagged_record',
        metadata: {
          flags: discarded.flags,
          uploadId: discarded.uploadId,
        },
      })

      const responseBody = toFlaggedRecordDto(discarded)
      validateOpenApiResponse({ path: '/contacts/flagged/{id}', method: 'patch', status: 200, body: responseBody })
      return reply.status(200).send(responseBody)
    }

    const suggested = getSuggestedData(flaggedRecord)
    const overrideData = bodyResult.data.data
    const approvedDraft = {
      name: overrideData?.name !== undefined ? overrideData.name : (toNullableText(suggested.name) ?? ''),
      phone: overrideData?.phone !== undefined ? overrideData.phone : (toNullableText(suggested.phone) ?? ''),
      email: overrideData?.email !== undefined ? overrideData.email : normalizeApprovedEmail(suggested.email),
      city: overrideData?.city !== undefined ? overrideData.city : toNullableText(suggested.city),
      company: overrideData?.company !== undefined ? overrideData.company : toNullableText(suggested.company),
      department: overrideData?.department !== undefined ? overrideData.department : toNullableText(suggested.department),
      serviceType: overrideData?.serviceType !== undefined ? overrideData.serviceType : toNullableText(suggested.serviceType),
      jobTitle: overrideData?.jobTitle !== undefined ? overrideData.jobTitle : toNullableText(suggested.jobTitle),
      eventDate: overrideData?.eventDate !== undefined ? overrideData.eventDate : toNullableText(suggested.eventDate),
    }

    if (!approvedDraft.name || !approvedDraft.phone) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Approved records require name and phone',
          details: [
            ...(!approvedDraft.name ? [{ field: 'name', message: 'Name is required' }] : []),
            ...(!approvedDraft.phone ? [{ field: 'phone', message: 'Phone is required' }] : []),
          ],
        },
      })
    }

    const approvedContact = await contactRepository.upsert({
      name: approvedDraft.name,
      phone: approvedDraft.phone,
      email: approvedDraft.email,
      serviceType: approvedDraft.serviceType,
      jobTitle: approvedDraft.jobTitle,
      city: approvedDraft.city,
      provinceCode: null,
      provinceName: null,
      cityCode: null,
      cityName: null,
      company: approvedDraft.company,
      department: approvedDraft.department,
      eventDate: approvedDraft.eventDate,
      topicTags: null,
      source: 'excel_upload',
      completenessScore: computeApprovalCompleteness({
        name: approvedDraft.name,
        phone: approvedDraft.phone,
        email: approvedDraft.email,
        company: approvedDraft.company,
        serviceType: approvedDraft.serviceType,
        jobTitle: approvedDraft.jobTitle,
        department: approvedDraft.department,
        city: approvedDraft.city,
      }),
      consentStatus: 'legacy_unverified',
      flagCategory: null,
      deletedAt: null,
    })

    await flaggedRecordsRepository.resolve(flaggedRecord.id, {
      name: approvedContact.name,
      phone: approvedContact.phone,
      email: approvedContact.email,
      city: approvedContact.city,
      company: approvedContact.company,
      department: approvedContact.department ?? null,
      serviceType: approvedContact.serviceType,
      jobTitle: approvedContact.jobTitle,
      eventDate: approvedContact.eventDate,
    }, actor.sub)

    const resolved = await flaggedRecordsRepository.findById(flaggedRecord.id)
    if (!resolved) {
      return reply.status(404).send({
        error: {
          code: 'NOT_FOUND',
          message: 'Flagged record not found after approval',
          details: [],
        },
      })
    }

    resolved.rawData = {
      ...resolved.rawData,
      normalized: {
        ...getSuggestedData(resolved),
        name: approvedContact.name,
        phone: approvedContact.phone,
        email: approvedContact.email,
        city: approvedContact.city,
        company: approvedContact.company,
        department: approvedContact.department ?? null,
        serviceType: approvedContact.serviceType,
        jobTitle: approvedContact.jobTitle,
        eventDate: approvedContact.eventDate,
      },
    }

    await auditLogRepository.create({
      action: 'flagged_record.approved',
      actorId: actor.sub,
      actorRole: actor.role,
      eventId: null,
      targetId: resolved.id,
      targetType: 'flagged_record',
      metadata: {
        contactId: approvedContact.id,
        uploadId: resolved.uploadId,
        flags: resolved.flags,
      },
    })

    const responseBody = toFlaggedRecordDto(resolved)
    validateOpenApiResponse({ path: '/contacts/flagged/{id}', method: 'patch', status: 200, body: responseBody })
    return reply.status(200).send(responseBody)
  })

  // ── POST /api/contacts/blast ──────────────────────────────────────
  const BlastBodySchema = z.union([
    z.object({
      contactIds: z.array(z.string().trim().min(1)),
      eventLink: z.string().trim().url(),
    }),
    z.object({
      segmentParams: z.record(z.string()),
      eventLink: z.string().trim().url(),
      total: z.number().int().min(1),
    }),
  ])

  fastify.post('/api/contacts/blast', adminOnly, async (request, reply) => {
    const bodyResult = BlastBodySchema.safeParse(request.body)
    if (!bodyResult.success) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid blast payload',
          details: bodyResult.error.issues,
        },
      })
    }

    validateOpenApiRequest({ path: '/contacts/blast', method: 'post', body: bodyResult.data })

    const actor = request.user as JwtPayload
    const payload = bodyResult.data
    
    // Determine blast target and actual recipient count
    const blastTarget = 'contactIds' in payload
      ? { type: 'contacts' as const, count: payload.contactIds.length, contactIds: payload.contactIds }
      : { type: 'segment' as const, count: payload.total, segmentParams: payload.segmentParams }

    // Enqueue the blast job to the marketing queue
    const queueName = 'marketing'
    const jobId = await queueService.enqueue(queueName, {
      eventId: 'contacts-blast', // Virtual event ID for contact blasts
      templateId: 'custom',
      templateName: 'Contact Blast',
      templateBody: `<p>Halo {{name}},</p><p>Anda diundang untuk menghadiri event kami. Silakan kunjungi: <a href="${payload.eventLink}">${payload.eventLink}</a></p><p>Kami mengharapkan kehadiran Anda.</p><p>Salam hormat,<br>Tim EM · U</p>`,
      channel: 'email',
      contactIds: 'contactIds' in payload ? payload.contactIds : undefined,
      filters: !('contactIds' in payload) ? payload.segmentParams : undefined,
      enqueuedBy: actor.sub,
    })

    // Persist blast to audit log with job ID
    await auditLogRepository.create({
      action: 'contact.blast_initiated',
      actorId: actor.sub,
      actorRole: actor.role,
      eventId: null,
      targetId: `blast-${Date.now()}`,
      targetType: 'contact_blast',
      metadata: {
        jobId,
        target: blastTarget,
        eventLink: payload.eventLink,
        channel: 'email',
        status: 'queued',
      },
    })

    const responseBody = {
      success: true,
      jobId,
      message: `Blast queued for ${blastTarget.count} contacts`,
      eventLink: payload.eventLink,
      recipientCount: blastTarget.count,
    }
    validateOpenApiResponse({ path: '/contacts/blast', method: 'post', status: 202, body: responseBody })
    return reply.status(202).send(responseBody)
  })

  // ── PUT /api/contacts/bulk-flag ───────────────────────────────────
  const BulkFlagBodySchema = z.object({
    ids: z.array(z.string().trim().min(1)),
    flagCategory: z.enum(['invalid-data', 'duplicate']).nullable(),
  })

  fastify.put('/api/contacts/bulk-flag', adminOnly, async (request, reply) => {
    const bodyResult = BulkFlagBodySchema.safeParse(request.body)
    if (!bodyResult.success) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid bulk flag payload',
          details: bodyResult.error.issues,
        },
      })
    }

    validateOpenApiRequest({ path: '/contacts/bulk-flag', method: 'put', body: bodyResult.data })

    const { ids, flagCategory } = bodyResult.data
    let updated = 0
    for (const id of ids) {
      const result = await contactRepository.update(id, { flagCategory })
      if (result) updated++
    }

    const actor = request.user as JwtPayload
    await auditLogRepository.create({
      action: 'contact.bulk_flagged',
      actorId: actor.sub,
      actorRole: actor.role,
      eventId: null,
      targetId: `bulk-flag-${Date.now()}`,
      targetType: 'contact',
      metadata: { ids, flagCategory, updated },
    })

    const responseBody = {
      success: true,
      updated,
      requested: ids.length,
      flagCategory,
    }
    validateOpenApiResponse({ path: '/contacts/bulk-flag', method: 'put', status: 200, body: responseBody })
    return reply.status(200).send(responseBody)
  })

  // GET /api/contacts/lookup?email=... — find contact by email (for OTS auto-fill)
  fastify.get('/api/contacts/lookup', async (request: FastifyRequest, reply: FastifyReply) => {
    const { email } = request.query as Record<string, string | undefined>
    if (!email || email.length < 3) {
      return reply.status(200).send(null)
    }

    const contact = await findContactByEmailOrPhone(email)
    if (!contact) {
      return reply.status(200).send(null)
    }

    return reply.status(200).send({
      id: contact.id,
      name: contact.name,
      email: contact.email,
      phone: contact.phone,
      serviceType: contact.serviceType,
      jobTitle: contact.jobTitle,
      company: contact.company,
    })
  })

  // ── GET /api/contacts/normalize/suggestions ───────────────────────
  fastify.get('/api/contacts/normalize/suggestions', { preHandler: [requireAuth] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { type, value } = request.query as Record<string, string | undefined>
    if (!type || !value) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'type and value required', details: [] } })
    }

    const normalizationService = getNormalizationService()
    if (type === 'industry') {
      const result = await normalizationService.matchIndustry(value)
      return reply.status(200).send(result)
    }
    if (type === 'jobTitle') {
      const result = await normalizationService.matchJobTitle(value)
      return reply.status(200).send(result)
    }

    return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Invalid type', details: [] } })
  })

  // ── GET /api/contacts/unmatched ───────────────────────────────────
  fastify.get('/api/contacts/unmatched', { preHandler: [requireAuth] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { type, page = '1', pageSize = '50' } = request.query as Record<string, string | undefined>
    if (!type || !['industry-unmatched', 'jobtitle-unmatched'].includes(type)) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Invalid type', details: [] } })
    }

    const normalizationService = getNormalizationService()
    const result = await normalizationService.getUnmatchedContacts(type as 'industry-unmatched' | 'jobtitle-unmatched', parseInt(page, 10), parseInt(pageSize, 10))
    return reply.status(200).send(result)
  })

  // ── PATCH /api/contacts/:id ──────────────────────────────────────
  fastify.patch('/api/contacts/:id', { preHandler: [requireAuth, requireAdmin] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const params = z.object({ id: z.string().min(1) }).safeParse((request as FastifyRequest).params)
    const body = z.object({
      name: z.string().trim().min(1).optional(),
      email: z.string().trim().nullable().optional(),
      phone: z.string().trim().nullable().optional(),
      city: z.string().trim().nullable().optional(),
      company: z.string().trim().nullable().optional(),
      serviceType: z.string().trim().nullable().optional(),
      jobTitle: z.string().trim().nullable().optional(),
    }).safeParse((request as FastifyRequest).body)

    if (!params.success || !body.success) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Invalid payload', details: [] } })
    }

    const contact = await contactRepository.findById(params.data.id)
    if (!contact) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Contact not found', details: [] } })
    }

    const update: Partial<Contact> = {}
    const data = body.data

    // Normalize phone number to Indonesian format before saving
    if (data.phone !== undefined) {
      if (data.phone === null || data.phone === '') {
        update.phone = null
      } else {
        const digits = data.phone.replace(/\D/g, '')
        if (digits.startsWith('0')) {
          update.phone = `+62${digits.slice(1)}`
        } else if (digits.startsWith('62')) {
          update.phone = `+${digits}`
        } else if (digits.startsWith('8')) {
          update.phone = `+62${digits}`
        } else if (digits.startsWith('+')) {
          update.phone = data.phone
        } else {
          update.phone = data.phone
        }
      }
    }

    if (data.name !== undefined) update.name = data.name
    if (data.email !== undefined) update.email = data.email
    if (data.city !== undefined) update.city = data.city
    if (data.company !== undefined) update.company = data.company
    if (data.serviceType !== undefined) update.serviceType = data.serviceType
    if (data.jobTitle !== undefined) update.jobTitle = data.jobTitle

    if (Object.keys(update).length === 0) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'No fields to update', details: [] } })
    }

    const updated = await contactRepository.update(params.data.id, update)
    if (!updated) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Contact not found', details: [] } })
    }

    return reply.status(200).send(updated)
  })

  // ── PATCH /api/contacts/:id/normalize ─────────────────────────────
  fastify.patch('/api/contacts/:id/normalize', { preHandler: [requireAuth, requireAdmin] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const params = z.object({ id: z.string().min(1) }).safeParse((request as FastifyRequest).params)
    const body = z.object({ field: z.enum(['serviceType', 'jobTitle']), standardId: z.string().min(1) }).safeParse((request as FastifyRequest).body)

    if (!params.success || !body.success) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Invalid payload', details: [] } })
    }

    const normalizationService = getNormalizationService()
    await normalizationService.normalizeContact(params.data.id, body.data.field, body.data.standardId)
    return reply.status(200).send({ success: true })
  })

  // ── POST /api/contacts/bulk-normalize ─────────────────────────────
  fastify.post('/api/contacts/bulk-normalize', { preHandler: [requireAuth, requireAdmin] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const body = z.object({ contactIds: z.array(z.string().min(1)), field: z.enum(['serviceType', 'jobTitle']), standardId: z.string().min(1) }).safeParse((request as FastifyRequest).body)
    if (!body.success) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Invalid payload', details: body.error.issues } })
    }

    const normalizationService = getNormalizationService()
    const count = await normalizationService.bulkNormalize(body.data.contactIds, body.data.field, body.data.standardId)
    return reply.status(200).send({ success: true, normalized: count })
  })

  // ── POST /api/contacts/scan-unmatched ─────────────────────────────
  fastify.post('/api/contacts/scan-unmatched', { preHandler: [requireAuth, requireAdmin] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const normalizationService = getNormalizationService()
    const result = await normalizationService.flagUnmatchedContacts()
    return reply.status(200).send(result)
  })
}
