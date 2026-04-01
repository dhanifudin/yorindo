import { http, HttpResponse, delay } from 'msw'
import { faker } from '@faker-js/faker'
import type { Vendor, CreateVendorBody } from '@/types/api'
import { makeMockCuid2 } from './id'

export let vendorsStore: Vendor[] = [
  {
    id: 'vendor-001',
    name: 'Alibaba Cloud',
    contact_email: 'sponsor@alibabacloud.com',
    industry: 'teknologi',
    logo_url: undefined,
    website: 'https://alibabacloud.com',
    notes: '',
    linked_event_count: 2,
    created_at: new Date(Date.now() - 90 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 30 * 86400000).toISOString(),
  },
  {
    id: 'vendor-002',
    name: 'AWS Indonesia',
    contact_email: 'aws-sponsor@amazon.com',
    industry: 'teknologi',
    logo_url: undefined,
    website: 'https://aws.amazon.com',
    notes: '',
    linked_event_count: 1,
    created_at: new Date(Date.now() - 60 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 10 * 86400000).toISOString(),
  },
  {
    id: 'vendor-003',
    name: 'PT Mandiri Sekuritas',
    contact_email: 'event@mandirisekuritas.co.id',
    industry: 'keuangan',
    logo_url: undefined,
    website: 'https://mandirisekuritas.co.id',
    notes: 'Sponsor tetap untuk event fintech',
    linked_event_count: 3,
    created_at: new Date(Date.now() - 45 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
  {
    id: 'vendor-004',
    name: 'Siemens Indonesia',
    contact_email: 'siemens-id@siemens.com',
    industry: 'manufaktur',
    logo_url: undefined,
    website: 'https://siemens.com/id',
    notes: '',
    linked_event_count: 0,
    created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 20 * 86400000).toISOString(),
  },
]

export const vendorHandlers = [
  http.get('/api/vendors', async ({ request }) => {
    await delay(350)
    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') ?? '1', 10)
    const pageSize = parseInt(url.searchParams.get('pageSize') ?? '20', 10)
    const total = vendorsStore.length
    const data = vendorsStore.slice((page - 1) * pageSize, page * pageSize)
    return HttpResponse.json({
      data,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    })
  }),

  http.post('/api/vendors', async ({ request }) => {
    await delay(500)
    const body = await request.json() as CreateVendorBody
    const now = new Date().toISOString()
    const newVendor: Vendor = {
      id: makeMockCuid2(),
      linked_event_count: 0,
      created_at: now,
      updated_at: now,
      ...body,
    }
    vendorsStore.push(newVendor)
    return HttpResponse.json(newVendor, { status: 201 })
  }),

  http.patch('/api/vendors/:id', async ({ params, request }) => {
    await delay(400)
    const body = await request.json() as Partial<CreateVendorBody>
    const idx = vendorsStore.findIndex((v) => v.id === params.id)
    if (idx === -1) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Vendor not found', details: [] } },
        { status: 404 }
      )
    }
    vendorsStore[idx] = { ...vendorsStore[idx], ...body, updated_at: new Date().toISOString() }
    return HttpResponse.json(vendorsStore[idx])
  }),

  http.delete('/api/vendors/:id', async ({ params }) => {
    await delay(350)
    const vendor = vendorsStore.find((v) => v.id === params.id)
    if (!vendor) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Vendor not found', details: [] } },
        { status: 404 }
      )
    }
    if (vendor.linked_event_count > 0) {
      return HttpResponse.json(
        {
          error: {
            code: 'VENDOR_HAS_LINKS',
            message: `Vendor masih terhubung ke ${vendor.linked_event_count} event — hapus keterkaitan terlebih dahulu`,
            details: [],
          },
        },
        { status: 409 }
      )
    }
    vendorsStore = vendorsStore.filter((v) => v.id !== params.id)
    return new HttpResponse(null, { status: 204 })
  }),
]
