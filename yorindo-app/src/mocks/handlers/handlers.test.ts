import { describe, it, expect } from 'vitest'

// Inline fetch helpers using the MSW server from vitest.setup.ts
// The server is configured with our handlers in vitest.setup.ts

describe('Contacts handler', () => {
  it('returns 20 contacts on page 1 from pool of 247', async () => {
    const res = await fetch('/api/contacts?page=1&pageSize=20')
    const data = await res.json()

    expect(res.ok).toBe(true)
    expect(data.data).toHaveLength(20)
    expect(data.pagination.total).toBe(247)
    expect(data.pagination.totalPages).toBe(Math.ceil(247 / 20))
    expect(data.pagination.page).toBe(1)
    expect(data.pagination.pageSize).toBe(20)
  })

  it('filters contacts by industry', async () => {
    const res = await fetch('/api/contacts?page=1&pageSize=50&industry=teknologi')
    const data = await res.json()

    expect(res.ok).toBe(true)
    // All returned contacts should match the industry filter
    data.data.forEach((contact: { industryId: string }) => {
      expect(contact.industryId).toBe('teknologi')
    })
  })

  it('returns correct pagination on page 2', async () => {
    const res = await fetch('/api/contacts?page=2&pageSize=20')
    const data = await res.json()

    expect(data.pagination.page).toBe(2)
    expect(data.data).toHaveLength(20)
  })
})

describe('Scan handler', () => {
  it('returns 401 for MOCK_INVALID token', async () => {
    const res = await fetch('/api/scan/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'MOCK_INVALID' }),
    })

    expect(res.status).toBe(401)
    const data = await res.json()
    expect(data.error.code).toBe('INVALID_TICKET')
  })

  it('returns already_attended for MOCK_ALREADY token', async () => {
    const res = await fetch('/api/scan/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'MOCK_ALREADY' }),
    })

    expect(res.ok).toBe(true)
    const data = await res.json()
    expect(data.status).toBe('already_attended')
  })

  it('returns success for any other token', async () => {
    const res = await fetch('/api/scan/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'some-valid-ticket-jwt' }),
    })

    expect(res.ok).toBe(true)
    const data = await res.json()
    expect(data.status).toBe('success')
    expect(data.registration).toBeDefined()
    expect(data.registration.contactName).toBeDefined()
  })
})

describe('Registrations handler', () => {
  it('PATCH /api/registrations/:id/status → approved generates ticketToken', async () => {
    // First create a registration
    const createRes = await fetch('/api/registrations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventId: 'event-001',
        name: 'Test User',
        email: 'test@test.com',
        phone: '+62812345678',
      }),
    })
    const created = await createRes.json()
    expect(createRes.status).toBe(201)
    expect(created.status).toBe('pending')
    expect(created.ticketToken).toBeNull()

    // Then approve it
    const approveRes = await fetch(`/api/registrations/${created.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'approved' }),
    })
    const approved = await approveRes.json()

    expect(approveRes.ok).toBe(true)
    expect(approved.status).toBe('approved')
    expect(approved.ticketToken).toBeTruthy()
    expect(approved.ticketToken).toMatch(/^ticket-/)
  })
})

describe('Events handler', () => {
  it('returns events in all status variants', async () => {
    const res = await fetch('/api/events')
    const data = await res.json()

    const statuses = data.data.map((e: { status: string }) => e.status)
    expect(statuses).toContain('draft')
    expect(statuses).toContain('published')
    expect(statuses).toContain('active')
    expect(statuses).toContain('completed')
    expect(statuses).toContain('cancelled')
  })

  it('POST /api/events creates and returns a new event', async () => {
    const res = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'New Test Event',
        eventDate: '2026-06-01T02:00:00.000Z',
        timezone: 'Asia/Jakarta',
      }),
    })
    const created = await res.json()

    expect(res.status).toBe(201)
    expect(created.name).toBe('New Test Event')
    expect(created.id).toBeDefined()
    expect(created.status).toBe('draft')
  })
})

describe('Auth handler', () => {
  it('POST /api/auth/login returns accessToken for valid credentials', async () => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@yorindo.app', password: 'password123' }),
    })
    const data = await res.json()

    expect(res.ok).toBe(true)
    expect(data.accessToken).toBeDefined()
    expect(data.user.role).toBe('admin')
  })

  it('POST /api/auth/login returns correct role per email', async () => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'budi@yorindo.app', password: 'password123' }),
    })
    const data = await res.json()
    expect(data.user.role).toBe('staff')
  })

  it('POST /api/auth/login returns 401 for unknown credentials', async () => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'unknown@example.com', password: 'wrongpass' }),
    })
    expect(res.status).toBe(401)
  })
})
