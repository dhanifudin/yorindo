import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { contactRepository } from '../container.js'
import type { CompanySize, Contact } from '../types/domain.js'

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

type ContactsQuery = z.infer<typeof ContactsQuerySchema>

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
    industryId: contact.industryId ?? '',
    jobTitleId: contact.jobTitleId ?? '',
    city: contact.city ?? '',
    companySize: toApiCompanySize(contact.companySize),
    completenessScore: contact.completenessScore,
    createdAt: contact.createdAt,
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
}
