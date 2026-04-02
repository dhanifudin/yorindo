import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { auditLogRepository, contactRepository, eventRepository, flaggedRecordsRepository, registrationRepository } from '../container.js'
import { requireAdmin, requireAuth, type JwtPayload } from '../middleware/auth.js'
import type { CompanySize, Contact, DuplicatePair, FlaggedRecord, FlaggedRecordStatus, RegistrationStatus } from '../types/domain.js'
import { INDONESIAN_INDUSTRIES, INDONESIAN_JOB_TITLES } from '../repositories/memory/_seeds.js'
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

const MergeParamsSchema = z.object({
  id: z.string().trim().min(1),
})

const FlaggedParamsSchema = z.object({
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
    industryId: z.string().trim().nullable().optional(),
    jobTitleId: z.string().trim().nullable().optional(),
    companySize: z.enum(['small', 'medium', 'large', 'enterprise']).nullable().optional(),
  }).optional(),
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
 * Mengubah id industri internal menjadi slug yang dipakai kontrak FE.
 */
function toIndustrySlug(industryId: Contact['industryId']): string {
  if (!industryId) return ''
  const found = INDONESIAN_INDUSTRIES.find((item) => item.id === industryId || item.slug === industryId)
  return found?.slug ?? industryId
}

function toIndustryId(industryId: string | null | undefined): string | null {
  if (!industryId) return null
  const found = INDONESIAN_INDUSTRIES.find((item) => item.id === industryId || item.slug === industryId)
  return found?.id ?? industryId
}

function toJobTitleId(jobTitleId: string | null | undefined): string | null {
  if (!jobTitleId) return null
  const found = INDONESIAN_JOB_TITLES.find((item) => item.id === jobTitleId || item.slug === jobTitleId)
  return found?.id ?? jobTitleId
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
    industry: facets.industries.map((item) => ({
      slug: toIndustrySlug(item.id),
      label: item.name,
      count: item.count,
    })),
    city: facets.cities.map((item) => ({
      slug: item.city.toLowerCase(),
      label: item.city,
      count: item.count,
    })),
    companySize: facets.companySizes.map((item) => ({
      slug: toApiCompanySize(item.size as Contact['companySize']),
      label: toApiCompanySize(item.size as Contact['companySize']).replace(/^./, (value) => value.toUpperCase()),
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
    industryId: toIndustrySlug(toIndustryId(toNullableText(normalized.industrySlug ?? normalized.industryId))),
    jobTitleId: toNullableText(normalized.jobTitleSlug ?? normalized.jobTitleId) ?? '',
    companySize: toApiCompanySize(toDomainCompanySize(toNullableText(normalized.companySize) ?? undefined) as Contact['companySize']),
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
  industryId: string | null
  jobTitleId: string | null
  city: string | null
  companySize: Contact['companySize']
}): number {
  const fields = [
    input.name,
    input.phone,
    input.email,
    input.company,
    input.industryId,
    input.jobTitleId,
    input.city,
    input.companySize,
  ]
  const filled = fields.filter((field) => field !== null && field !== undefined && field !== '').length
  return Math.round((filled / fields.length) * 1000) / 1000
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
      industry?: string
      city?: string
      companySize?: string
      missingEmail?: boolean
      missingPhone?: boolean
      flagCategory?: string
      search?: string
    }

    const sortBy = toSortBy(query.sortBy)
    const companySize = toDomainCompanySize(query.companySize)
    const flagFilter = toFlagFilter(query.flagFilter)
    if (sortBy) paginationParams.sortBy = sortBy
    if (query.sortDir) paginationParams.sortDir = query.sortDir
    if (query.industry) filters.industry = query.industry
    if (query.city) filters.city = query.city
    if (companySize) filters.companySize = companySize
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
  fastify.delete('/api/contacts/duplicates/:id', adminOnly, async (request, reply) => {
    const paramsResult = FlaggedParamsSchema.safeParse(request.params)
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
      industryId: overrideData?.industryId !== undefined ? overrideData.industryId : toNullableText(suggested.industryId),
      jobTitleId: overrideData?.jobTitleId !== undefined ? overrideData.jobTitleId : toNullableText(suggested.jobTitleId),
      companySize: overrideData?.companySize !== undefined ? overrideData.companySize : (toNullableText(suggested.companySize) as string | null),
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
      industryId: toIndustryId(approvedDraft.industryId),
      jobTitleId: toJobTitleId(approvedDraft.jobTitleId),
      city: approvedDraft.city,
      company: approvedDraft.company,
      department: approvedDraft.department,
      companySize: toDomainCompanySize(approvedDraft.companySize ?? undefined) as Contact['companySize'],
      source: 'excel_upload',
      completenessScore: computeApprovalCompleteness({
        name: approvedDraft.name,
        phone: approvedDraft.phone,
        email: approvedDraft.email,
        company: approvedDraft.company,
        industryId: toIndustryId(approvedDraft.industryId),
        jobTitleId: toJobTitleId(approvedDraft.jobTitleId),
        city: approvedDraft.city,
        companySize: toDomainCompanySize(approvedDraft.companySize ?? undefined) as Contact['companySize'],
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
      industryId: approvedContact.industryId,
      jobTitleId: approvedContact.jobTitleId,
      companySize: approvedContact.companySize,
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
        industryId: toIndustrySlug(approvedContact.industryId),
        jobTitleId: approvedContact.jobTitleId ?? '',
        companySize: toApiCompanySize(approvedContact.companySize),
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
}
