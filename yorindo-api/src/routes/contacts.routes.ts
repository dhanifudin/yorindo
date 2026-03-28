import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { contactRepository } from '../container.js'
import type { CompanySize, Contact, DuplicatePair } from '../types/domain.js'
import { INDONESIAN_INDUSTRIES } from '../repositories/memory/_seeds.js'

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

const MergeParamsSchema = z.object({
  id: z.string().trim().min(1),
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
    email: contact.email ?? '',
    phone: contact.phone,
    company: contact.company ?? '',
    industryId: toIndustrySlug(contact.industryId),
    jobTitleId: contact.jobTitleId ?? '',
    city: contact.city ?? '',
    companySize: toApiCompanySize(contact.companySize),
    completenessScore: contact.completenessScore,
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

export const contactRoutes: FastifyPluginAsync = async (fastify) => {
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

    return reply.status(200).send({
      data: data.map(toContactDto),
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.ceil(total / query.pageSize),
      },
    })
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

    const query = result.data.q
    if (!query || query.length < 2) {
      return reply.status(200).send({
        suggestions: [],
        matchedSlug: null,
        fallback: false,
      })
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

    return reply.status(200).send({
      suggestions,
      matchedSlug: best && best.confidence >= 0.6 ? best.slug : null,
      fallback: !best || best.confidence < 0.6,
    })
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

    const query = result.data
    const { data, total } = await contactRepository.findDuplicates({
      page: query.page,
      pageSize: query.pageSize,
    })

    return reply.status(200).send({
      data: data.map(toDuplicatePairDto),
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.ceil(total / query.pageSize),
      },
    })
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

    return reply.status(200).send(toContactDto(merged))
  })
}
