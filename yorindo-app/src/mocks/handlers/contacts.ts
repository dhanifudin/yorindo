import { http, HttpResponse, delay } from 'msw'
import { faker } from '@faker-js/faker'
import type { Contact, FlagCategory, PaginatedResponse, RecommendedEventsResponse } from '@/types/api'
import { eventsStore } from './events'

faker.seed(42)

const INDONESIAN_CITIES = [
  'Jakarta', 'Surabaya', 'Bandung', 'Medan', 'Semarang',
  'Makassar', 'Yogyakarta', 'Palembang', 'Tangerang', 'Depok',
]
const INDUSTRIES = [
  'teknologi', 'kesehatan', 'manufaktur', 'keuangan', 'pendidikan',
  'retail', 'properti', 'otomotif', 'energi', 'telekomunikasi',
]
const COMPANY_SIZES = ['micro', 'small', 'medium', 'large', 'enterprise'] as const
const JOB_TITLES = ['direktur', 'manajer', 'supervisor', 'staff', 'koordinator']
const FLAG_CATEGORIES: FlagCategory[] = ['spam', 'not-potential', 'invalid-data', 'duplicate']

// Seeded pool of 247 contacts — deterministic with faker.seed(42)
export const contactsPool: Contact[] = Array.from({ length: 247 }, (_, i) => ({
  id: faker.string.uuid(),
  name: faker.person.fullName(),
  phone: `+62${faker.string.numeric(10)}`,
  email: faker.internet.email(),
  industryId: faker.helpers.arrayElement(INDUSTRIES),
  jobTitleId: faker.helpers.arrayElement(JOB_TITLES),
  city: faker.helpers.arrayElement(INDONESIAN_CITIES),
  companySize: faker.helpers.arrayElement(COMPANY_SIZES),
  completenessScore: parseFloat((faker.number.float({ min: 0.4, max: 1.0 })).toFixed(2)),
  // Pre-flag first 5 contacts with various categories
  flagCategory: i < 5 ? FLAG_CATEGORIES[i % FLAG_CATEGORIES.length] : null,
  createdAt: faker.date.past().toISOString(),
  updatedAt: faker.date.recent().toISOString(),
}))

export const contactHandlers = [
  http.get('/api/contacts', async ({ request }) => {
    await delay(400)
    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') ?? '1', 10)
    const pageSize = parseInt(url.searchParams.get('pageSize') ?? '20', 10)
    const industry = url.searchParams.get('industry') ?? ''
    const city = url.searchParams.get('city') ?? ''
    const companySize = url.searchParams.get('companySize') ?? ''
    const flagFilter = url.searchParams.get('flagFilter') ?? ''

    let filtered = contactsPool
    if (industry) filtered = filtered.filter((c) => c.industryId === industry)
    if (city) filtered = filtered.filter((c) => c.city.toLowerCase() === city.toLowerCase())
    if (companySize) filtered = filtered.filter((c) => c.companySize === companySize)
    if (flagFilter === 'flagged') filtered = filtered.filter((c) => c.flagCategory !== null)
    if (flagFilter === 'unflagged') filtered = filtered.filter((c) => c.flagCategory === null)

    const total = filtered.length
    const start = (page - 1) * pageSize
    const data = filtered.slice(start, start + pageSize)

    const response: PaginatedResponse<Contact> = {
      data,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    }
    return HttpResponse.json(response)
  }),

  http.post('/api/contacts/import', async () => {
    await delay(400)
    return HttpResponse.json({ jobId: `etl:upload:${faker.number.int()}`, status: 'queued' }, { status: 202 })
  }),

  http.get('/api/contacts/flagged', async ({ request }) => {
    await delay(400)
    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') ?? '1', 10)
    const pageSize = parseInt(url.searchParams.get('pageSize') ?? '20', 10)
    const statusFilter = url.searchParams.get('status') ?? 'pending'

    const flaggedPool = Array.from({ length: 18 }, (_, i) => ({
      id: `flagged-${i + 1}`,
      status: i < 12 ? 'pending' : i < 15 ? 'resolved' : 'discarded',
      rawData: {
        name: faker.person.fullName(),
        phone: `+62${faker.string.numeric(10)}`,
        email: faker.internet.email(),
        industry: faker.helpers.arrayElement(['kesehatan', 'tech', 'manufaktur', 'edu']),
        city: faker.helpers.arrayElement(INDONESIAN_CITIES),
      },
      flags: faker.helpers.arrayElements([
        'LOW_CONFIDENCE_INDUSTRY',
        'PHONE_FORMAT_INVALID',
        'EMAIL_UNVERIFIABLE',
        'NAME_INCOMPLETE',
        'CITY_UNRECOGNIZED',
      ], { min: 1, max: 3 }),
      createdAt: faker.date.recent().toISOString(),
    }))

    const filtered = statusFilter === 'all' ? flaggedPool : flaggedPool.filter((f) => f.status === statusFilter)
    const total = filtered.length
    const data = filtered.slice((page - 1) * pageSize, page * pageSize)
    return HttpResponse.json({ data, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } })
  }),

  http.get('/api/contacts/industry-suggestions', async ({ request }) => {
    await delay(500)
    const url = new URL(request.url)
    const q = url.searchParams.get('q') ?? ''
    if (!q || q.length < 2) return HttpResponse.json({ suggestions: [] })
    const allIndustries = INDUSTRIES.map((slug) => ({
      slug,
      label: slug.charAt(0).toUpperCase() + slug.slice(1),
      confidence: Math.random() > 0.3 ? 0.85 : 0.45,
    }))
    const matched = allIndustries.filter((i) =>
      i.slug.includes(q.toLowerCase()) || i.label.toLowerCase().includes(q.toLowerCase())
    )
    return HttpResponse.json({
      suggestions: matched.slice(0, 5),
      matchedSlug: matched[0]?.confidence >= 0.6 ? matched[0]?.slug : null,
      fallback: !matched[0] || matched[0].confidence < 0.6,
    })
  }),

  http.post('/api/contacts/:id/merge', async ({ params }) => {
    await delay(600)
    const contact = contactsPool.find((c) => c.id === params.id)
    if (!contact) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Contact not found', details: [] } },
        { status: 404 }
      )
    }
    return HttpResponse.json({ ...contact, updatedAt: new Date().toISOString() })
  }),

  http.get('/api/contacts/duplicates', async ({ request }) => {
    await delay(400)
    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') ?? '1', 10)
    const pageSize = parseInt(url.searchParams.get('pageSize') ?? '10', 10)
    const duplicates = Array.from({ length: 6 }, (_, i) => ({
      id: `dup-group-${i + 1}`,
      primary: contactsPool[i * 2],
      duplicate: contactsPool[i * 2 + 1],
      matchScore: faker.number.float({ min: 0.7, max: 0.99, fractionDigits: 2 }),
      matchReasons: faker.helpers.arrayElements(['same_phone', 'same_email', 'similar_name'], { min: 1, max: 2 }),
    }))
    const total = duplicates.length
    const data = duplicates.slice((page - 1) * pageSize, page * pageSize)
    return HttpResponse.json({ data, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } })
  }),

  http.get('/api/contacts/count', async ({ request }) => {
    await delay(300)
    const url = new URL(request.url)
    const industry = url.searchParams.get('industry')
    const city = url.searchParams.get('city')
    let count = contactsPool.length
    if (industry) count = Math.floor(count * 0.3)
    if (city) count = Math.floor(count * 0.4)
    return HttpResponse.json({ count })
  }),

  http.get('/api/contacts/lookup', async ({ request }) => {
    await delay(200)
    const url = new URL(request.url)
    const phone = url.searchParams.get('phone')
    if (!phone) return HttpResponse.json(null)
    const contact = contactsPool[0] // always return first contact as "found"
    return HttpResponse.json(contact)
  }),

  http.get('/api/contacts/suppression', async ({ request }) => {
    await delay(300)
    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') ?? '1', 10)
    const pageSize = parseInt(url.searchParams.get('pageSize') ?? '20', 10)
    const q = url.searchParams.get('q') ?? ''
    const pool = Array.from({ length: 25 }, (_, i) => ({
      id: `sup-${i + 1}`,
      name: faker.person.fullName(),
      email: faker.internet.email(),
      phone: `+62${faker.string.numeric(10)}`,
      suppressedAt: faker.date.past().toISOString(),
      reason: faker.helpers.arrayElement(['unsubscribed', 'erasure_request', 'manually_added']),
    }))
    const filtered = q
      ? pool.filter((s) => s.email.includes(q) || s.phone.includes(q) || s.name.toLowerCase().includes(q.toLowerCase()))
      : pool
    const total = filtered.length
    const data = filtered.slice((page - 1) * pageSize, page * pageSize)
    return HttpResponse.json({ data, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } })
  }),

  http.post('/api/contacts/suppression', async ({ request }) => {
    await delay(400)
    const body = await request.json() as { email?: string; phone?: string; reason?: string }
    return HttpResponse.json({
      id: faker.string.uuid(),
      ...body,
      suppressedAt: new Date().toISOString(),
      reason: body.reason ?? 'manually_added',
    }, { status: 201 })
  }),

  http.delete('/api/contacts/suppression/:id', async () => {
    await delay(300)
    return new HttpResponse(null, { status: 204 })
  }),

  http.get('/api/contacts/:id/recommended-events', async ({ params }) => {
    await delay(400)
    const contactId = params.id as string
    const djb2 = (s: string) => s.split('').reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 100, 0)
    const eligible = eventsStore.filter((e) => e.status === 'published' || e.status === 'active')
    const recommendations = eligible
      .map((event) => ({
        eventId: event.id,
        name: event.name,
        eventDate: event.eventDate,
        status: event.status,
        score: djb2(contactId + event.id),
        factors: [
          ...(event.industryTags?.length ? [`industry:${event.industryTags[0]}`] : []),
          ...(event.eventType ? [`type:${event.eventType}`] : []),
        ],
      }))
      .sort((a, b) => b.score - a.score)
    const response: RecommendedEventsResponse = {
      recommendations,
      totalMatched: recommendations.length,
    }
    return HttpResponse.json(response)
  }),

  http.put('/api/contacts/:id', async ({ params, request }) => {
    await delay(300)
    const id = params.id as string
    const contact = contactsPool.find((c) => c.id === id)
    if (!contact) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Contact not found', details: [] } },
        { status: 404 }
      )
    }
    const body = await request.json() as { flagCategory?: FlagCategory }
    if (body.flagCategory !== undefined) {
      contact.flagCategory = body.flagCategory
    }
    contact.updatedAt = new Date().toISOString()
    return HttpResponse.json(contact)
  }),

  http.post('/api/contacts/flagged/:id', async () => {
    await delay(400)
    return HttpResponse.json({
      id: faker.string.uuid(),
      rawData: {},
      suggestedData: {},
      reason: 'Incomplete data',
      createdAt: new Date().toISOString(),
    })
  }),
]
