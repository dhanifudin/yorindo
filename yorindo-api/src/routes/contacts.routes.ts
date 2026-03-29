import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { contactRepository, flaggedRecordsRepository } from '../container.js'
import type { CompanySize, Contact, DuplicatePair } from '../types/domain.js'
import { INDONESIAN_INDUSTRIES } from '../repositories/memory/_seeds.js'
import { validateOpenApiRequest, validateOpenApiResponse } from '../lib/openapi-contract.js'

const COMPANY_SIZE_TO_DOMAIN: Record<string, CompanySize> = {
  small: '<50',
  medium: '50-200',
  large: '200-1000',
  enterprise: '>1000',
}

const COMPANY_SIZE_TO_API: Record<CompanySize, string> = {
  '<50': 'small',
  '50-200': 'medium',
  '200-1000': 'large',
  '>1000': 'enterprise',
}

const ContactsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  industry: z.string().trim().optional(),
  city: z.string().trim().optional(),
  companySize: z.string().trim().optional(),
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

const MergeParamsSchema = z.object({
  id: z.string().trim().min(1),
})

const FlaggedRecordParamsSchema = z.object({
  id: z.string().trim().min(1),
})

const ResolveFlaggedBodySchema = z.object({
  action: z.enum(['approve', 'discard']),
  resolved_data: z.record(z.string()).optional(),
})

const MergeBodySchema = z.object({
  mergeIntoId: z.string().trim().optional(),
  fieldSelections: z.record(z.enum(['primary', 'duplicate'])).optional(),
}).optional()

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

/**
 * Mengubah nilai company size FE ke enum internal repository.
 */
function toDomainCompanySize(companySize?: string): string | undefined {
  if (!companySize) return undefined
  return COMPANY_SIZE_TO_DOMAIN[companySize] ?? companySize
}

/**
 * Mengubah nilai company size domain ke bentuk respons yang dipakai FE.
 */
function toApiCompanySize(companySize: Contact['companySize']): string {
  if (!companySize) return ''
  return COMPANY_SIZE_TO_API[companySize] ?? companySize
}

/**
 * Mengubah id industri internal menjadi slug yang dipakai kontrak FE.
 */
function toIndustrySlug(industryId: Contact['industryId']): string {
  if (!industryId) return ''
  const found = INDONESIAN_INDUSTRIES.find((item) => item.id === industryId || item.slug === industryId)
  return found?.slug ?? industryId
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
    industryId: toIndustrySlug(contact.industryId),
    jobTitleId: contact.jobTitleId ?? '',
    city: contact.city ?? '',
    companySize: toApiCompanySize(contact.companySize),
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
 * Membentuk DTO flagged record yang tetap kompatibel dengan FE dan kontrak OpenAPI.
 */
function toFlaggedRecordDto(record: Awaited<ReturnType<typeof flaggedRecordsRepository.findById>>) {
  if (!record) return null

  return {
    id: record.id,
    rawData: record.rawData,
    suggestedData: record.rawData,
    reason: record.flags.join(', '),
    createdAt: record.createdAt,
    flags: record.flags,
    status: record.status,
  }
}

export const contactRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/api/contacts/health', async (_request, reply) => {
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

  fastify.get('/api/contacts', async (request, reply) => {
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
      industry?: string
      city?: string
      companySize?: string
    }

    const sortBy = toSortBy(query.sortBy)
    const companySize = toDomainCompanySize(query.companySize)
    if (sortBy) paginationParams.sortBy = sortBy
    if (query.sortDir) paginationParams.sortDir = query.sortDir
    if (query.industry) filters.industry = query.industry
    if (query.city) filters.city = query.city
    if (companySize) filters.companySize = companySize

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

  fastify.get('/api/contacts/industry-suggestions', async (request, reply) => {
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

  fastify.get('/api/contacts/duplicates', async (request, reply) => {
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

  fastify.delete('/api/contacts/duplicates/:id', async (request, reply) => {
    const paramsResult = FlaggedRecordParamsSchema.safeParse(request.params)
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

  fastify.post('/api/contacts/:id/merge', async (request, reply) => {
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

  fastify.get('/api/contacts/flagged', async (request, reply) => {
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

    const status = result.data.status === 'all' ? undefined : result.data.status
    const { data, total } = await flaggedRecordsRepository.findAll(
      { page: result.data.page, pageSize: result.data.pageSize },
      status,
    )

    const responseBody = {
      data: data.map((record) => toFlaggedRecordDto(record)).filter(Boolean),
      pagination: {
        page: result.data.page,
        pageSize: result.data.pageSize,
        total,
        totalPages: Math.ceil(total / result.data.pageSize),
      },
    }
    validateOpenApiResponse({ path: '/contacts/flagged', method: 'get', status: 200, body: responseBody })
    return reply.status(200).send(responseBody)
  })

  fastify.post('/api/contacts/flagged/:id', async (request, reply) => {
    const paramsResult = FlaggedRecordParamsSchema.safeParse(request.params)
    const bodyResult = ResolveFlaggedBodySchema.safeParse(request.body)

    if (!paramsResult.success || !bodyResult.success) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid flagged record payload',
          details: [
            ...(paramsResult.success ? [] : paramsResult.error.issues),
            ...(bodyResult.success ? [] : bodyResult.error.issues),
          ],
        },
      })
    }
    validateOpenApiRequest({ path: '/contacts/flagged/{id}', method: 'post', params: paramsResult.data, body: bodyResult.data })

    const existing = await flaggedRecordsRepository.findById(paramsResult.data.id)
    if (!existing) {
      return reply.status(404).send({
        error: {
          code: 'NOT_FOUND',
          message: 'Flagged record not found',
          details: [],
        },
      })
    }

    if (bodyResult.data.action === 'approve') {
      await flaggedRecordsRepository.resolve(
        paramsResult.data.id,
        bodyResult.data.resolved_data ?? {},
        'system-admin',
      )
    } else {
      await flaggedRecordsRepository.discard(paramsResult.data.id, 'system-admin')
    }

    const updated = await flaggedRecordsRepository.findById(paramsResult.data.id)
    if (!updated) {
      return reply.status(404).send({
        error: {
          code: 'NOT_FOUND',
          message: 'Flagged record not found',
          details: [],
        },
      })
    }

    const responseBody = toFlaggedRecordDto(updated)
    validateOpenApiResponse({ path: '/contacts/flagged/{id}', method: 'post', status: 200, body: responseBody })
    return reply.status(200).send(responseBody)
  })
}
