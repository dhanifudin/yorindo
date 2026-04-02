import type { FastifyPluginAsync, FastifyReply } from 'fastify'
import { z } from 'zod'
import { vendorRepository, eventSponsorRepository } from '../container.js'
import { requireAuth, requireRoles } from '../middleware/auth.js'
import type { Vendor } from '../types/domain.js'
import { validateOpenApiRequest, validateOpenApiResponse } from '../lib/openapi-contract.js'

const VendorIdParamsSchema = z.object({
  id: z.string().trim().min(1),
})

const VendorListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

const CreateVendorBodySchema = z.object({
  name: z.string().trim().min(1),
  contact_email: z.string().email().trim(),
  industry: z.string().trim().min(1),
  logo_url: z.string().url().nullish().transform((v) => v || null),
  website: z.string().url().nullish().transform((v) => v || null),
  notes: z.string().nullish().transform((v) => v || null),
})

const UpdateVendorBodySchema = z.object({
  name: z.string().trim().min(1).optional(),
  contact_email: z.string().email().trim().optional(),
  industry: z.string().trim().min(1).optional(),
  logo_url: z.string().url().nullish().transform((v) => (v === undefined ? undefined : v || null)),
  website: z.string().url().nullish().transform((v) => (v === undefined ? undefined : v || null)),
  notes: z.string().nullish().transform((v) => (v === undefined ? undefined : v || null)),
})

function replyValidationError(reply: FastifyReply, details: unknown, message: string) {
  return reply.status(400).send({
    error: {
      code: 'VALIDATION_ERROR',
      message,
      details,
    },
  })
}

async function toVendorDto(vendor: Vendor) {
  const count = await eventSponsorRepository.countByVendor(vendor.id)
  return {
    id: vendor.id,
    name: vendor.name,
    contact_email: vendor.contactEmail,
    industry: vendor.industry,
    logo_url: vendor.logoUrl,
    website: vendor.website,
    notes: vendor.notes ?? '',
    linked_event_count: count,
    created_at: vendor.createdAt,
    updated_at: vendor.updatedAt,
  }
}

export const vendorsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/api/vendors', { preHandler: [requireAuth, requireRoles('admin', 'viewer')] }, async (request, reply) => {
    const parsed = VendorListQuerySchema.safeParse(request.query)
    if (!parsed.success) return replyValidationError(reply, parsed.error.issues, 'Invalid query params')

    const query = parsed.data
    validateOpenApiRequest({ path: '/vendors', method: 'get', query })

    const result = await vendorRepository.findAll(query.page, query.pageSize)
    const data = await Promise.all(result.data.map(toVendorDto))

    const responseBody = {
      data,
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total: result.total,
        totalPages: Math.ceil(result.total / query.pageSize),
      },
    }

    validateOpenApiResponse({ path: '/vendors', method: 'get', status: 200, body: responseBody })
    return reply.status(200).send(responseBody)
  })

  fastify.post('/api/vendors', { preHandler: [requireAuth, requireRoles('admin')] }, async (request, reply) => {
    const body = CreateVendorBodySchema.safeParse(request.body)
    if (!body.success) return replyValidationError(reply, body.error.issues, 'Invalid request body')

    validateOpenApiRequest({ path: '/vendors', method: 'post', body: body.data })

    const vendor = await vendorRepository.create({
      name: body.data.name,
      contactEmail: body.data.contact_email,
      industry: body.data.industry,
      logoUrl: body.data.logo_url ?? null,
      website: body.data.website ?? null,
      notes: body.data.notes ?? null,
    })

    const responseBody = await toVendorDto(vendor)
    validateOpenApiResponse({ path: '/vendors', method: 'post', status: 201, body: responseBody })
    return reply.status(201).send(responseBody)
  })

  fastify.get('/api/vendors/:id', { preHandler: [requireAuth, requireRoles('admin', 'viewer')] }, async (request, reply) => {
    const params = VendorIdParamsSchema.safeParse(request.params)
    if (!params.success) return replyValidationError(reply, params.error.issues, 'Invalid vendor params')

    validateOpenApiRequest({ path: '/vendors/{id}', method: 'get', params: params.data })

    const vendor = await vendorRepository.findById(params.data.id)
    if (!vendor) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Vendor not found', details: [] } })
    }

    const responseBody = await toVendorDto(vendor)
    validateOpenApiResponse({ path: '/vendors/{id}', method: 'get', status: 200, body: responseBody })
    return reply.status(200).send(responseBody)
  })

  fastify.patch('/api/vendors/:id', { preHandler: [requireAuth, requireRoles('admin')] }, async (request, reply) => {
    const params = VendorIdParamsSchema.safeParse(request.params)
    const body = UpdateVendorBodySchema.safeParse(request.body)
    if (!params.success || !body.success) {
      return replyValidationError(
        reply,
        [...(params.success ? [] : params.error.issues), ...(body.success ? [] : body.error.issues)],
        'Invalid update payload'
      )
    }

    const bodyDataToValidate = { ...body.data }
    if (Object.keys(bodyDataToValidate).length === 0) {
      // openapi payload might be empty and valid, just need to run it 
    }
    validateOpenApiRequest({ path: '/vendors/{id}', method: 'patch', params: params.data, body: body.data })

    const existing = await vendorRepository.findById(params.data.id)
    if (!existing) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Vendor not found', details: [] } })
    }

    const updates: Partial<Vendor> = {}
    if (body.data.name !== undefined) updates.name = body.data.name
    if (body.data.contact_email !== undefined) updates.contactEmail = body.data.contact_email
    if (body.data.industry !== undefined) updates.industry = body.data.industry
    if (body.data.logo_url !== undefined) updates.logoUrl = body.data.logo_url
    if (body.data.website !== undefined) updates.website = body.data.website
    if (body.data.notes !== undefined) updates.notes = body.data.notes

    const updated = await vendorRepository.update(existing.id, updates)
    const responseBody = await toVendorDto(updated ?? existing)

    validateOpenApiResponse({ path: '/vendors/{id}', method: 'patch', status: 200, body: responseBody })
    return reply.status(200).send(responseBody)
  })

  fastify.delete('/api/vendors/:id', { preHandler: [requireAuth, requireRoles('admin')] }, async (request, reply) => {
    const params = VendorIdParamsSchema.safeParse(request.params)
    if (!params.success) return replyValidationError(reply, params.error.issues, 'Invalid vendor id')

    validateOpenApiRequest({ path: '/vendors/{id}', method: 'delete', params: params.data })

    const existing = await vendorRepository.findById(params.data.id)
    if (!existing) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Vendor not found', details: [] } })
    }

    const count = await eventSponsorRepository.countByVendor(existing.id)
    if (count > 0) {
      return reply.status(409).send({ error: { code: 'CONFLICT', message: 'Vendor is still linked to one or more events', details: [] } })
    }

    await vendorRepository.delete(existing.id)
    return reply.status(204).send()
  })
}
