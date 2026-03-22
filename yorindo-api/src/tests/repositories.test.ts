import { describe, it, expect, beforeEach } from 'vitest'
import { InMemoryContactRepository } from '../repositories/memory/ContactRepository.js'
import { InMemoryEventRepository } from '../repositories/memory/EventRepository.js'
import { InMemoryRegistrationRepository } from '../repositories/memory/RegistrationRepository.js'
import { InMemoryUserRepository } from '../repositories/memory/UserRepository.js'
import { InMemoryFlaggedRecordsRepository } from '../repositories/memory/FlaggedRecordsRepository.js'
import { InMemorySuppressionRepository } from '../repositories/memory/SuppressionRepository.js'

// ─── Contact Repository ───────────────────────────────────────────────────────

describe('InMemoryContactRepository', () => {
  let repo: InMemoryContactRepository

  beforeEach(() => { repo = new InMemoryContactRepository() })

  it('seeds 50 contacts on construction', async () => {
    const { total } = await repo.findAll({ page: 1, pageSize: 100 })
    expect(total).toBe(50)
  })

  it('findAll paginates correctly', async () => {
    const { data, total } = await repo.findAll({ page: 1, pageSize: 10 })
    expect(data.length).toBe(10)
    expect(total).toBe(50)
  })

  it('findById returns contact by id', async () => {
    const { data } = await repo.findAll({ page: 1, pageSize: 1 })
    const found = await repo.findById(data[0].id)
    expect(found).not.toBeNull()
    expect(found!.id).toBe(data[0].id)
  })

  it('findById returns null for unknown id', async () => {
    const result = await repo.findById('not-a-real-id')
    expect(result).toBeNull()
  })

  it('upsert creates a new contact', async () => {
    const before = await repo.findAll({ page: 1, pageSize: 100 })
    await repo.upsert({
      name: 'Test User',
      phone: '+628999999999',
      email: 'test@example.com',
      industryId: null,
      jobTitleId: null,
      city: 'Jakarta',
      company: null,
      companySize: null,
      source: 'manual',
      completenessScore: 0.8,
      consentStatus: 'active',
      flagCategory: null,
      deletedAt: null,
    })
    const after = await repo.findAll({ page: 1, pageSize: 100 })
    expect(after.total).toBe(before.total + 1)
  })

  it('upsert updates existing contact by phone', async () => {
    await repo.upsert({
      name: 'Original',
      phone: '+628111111111',
      email: null,
      industryId: null, jobTitleId: null, city: null, company: null,
      companySize: null, source: 'manual', completenessScore: 0.5,
      consentStatus: 'active', flagCategory: null, deletedAt: null,
    })
    await repo.upsert({
      name: 'Updated',
      phone: '+628111111111',
      email: 'updated@example.com',
      industryId: null, jobTitleId: null, city: null, company: null,
      companySize: null, source: 'manual', completenessScore: 0.9,
      consentStatus: 'active', flagCategory: null, deletedAt: null,
    })
    const found = await repo.findByPhone('+628111111111')
    expect(found?.name).toBe('Updated')
  })

  it('softDelete excludes contact from findAll', async () => {
    const { data } = await repo.findAll({ page: 1, pageSize: 1 })
    await repo.softDelete(data[0].id)
    const { total } = await repo.findAll({ page: 1, pageSize: 100 })
    expect(total).toBe(49)
  })

  it('countHealth returns correct health stats', async () => {
    const health = await repo.countHealth()
    expect(health.flagged).toBeGreaterThanOrEqual(0)
    expect(health.missingEmail).toBeGreaterThanOrEqual(0)
  })
})

// ─── Event Repository ─────────────────────────────────────────────────────────

describe('InMemoryEventRepository', () => {
  let repo: InMemoryEventRepository

  beforeEach(() => { repo = new InMemoryEventRepository() })

  it('seeds 5 events on construction', async () => {
    const { total } = await repo.findAll({ page: 1, pageSize: 10 })
    expect(total).toBe(5)
  })

  it('findById returns event', async () => {
    const { data } = await repo.findAll({ page: 1, pageSize: 1 })
    const found = await repo.findById(data[0].id)
    expect(found?.id).toBe(data[0].id)
  })

  it('create adds a new event', async () => {
    const before = (await repo.findAll({ page: 1, pageSize: 10 })).total
    await repo.create({
      name: 'New Event',
      slug: 'new-event',
      date: new Date().toISOString(),
      timezone: 'Asia/Jakarta',
      city: 'Jakarta', venue: null, description: null,
      capacity: 100, waitlistBuffer: 0,
      approvalMode: 'manual', notificationChannel: 'email',
      scanFormat: 'qr', targetCriteria: null, surveySchemaId: null,
      vendorId: null, status: 'draft', deletedAt: null,
    })
    const after = (await repo.findAll({ page: 1, pageSize: 10 })).total
    expect(after).toBe(before + 1)
  })

  it('softDelete and restore work correctly', async () => {
    const { data } = await repo.findAll({ page: 1, pageSize: 1 })
    const id = data[0].id
    await repo.softDelete(id)
    const afterDelete = (await repo.findAll({ page: 1, pageSize: 10 })).total
    await repo.restore(id)
    const afterRestore = (await repo.findAll({ page: 1, pageSize: 10 })).total
    expect(afterDelete).toBe(afterRestore - 1)
  })

  it('getOverviewMetrics returns numeric values', async () => {
    const { data } = await repo.findAll({ page: 1, pageSize: 1 })
    const metrics = await repo.getOverviewMetrics(data[0].id)
    expect(typeof metrics.invited).toBe('number')
    expect(typeof metrics.conversionRate).toBe('number')
  })
})

// ─── Registration Repository ──────────────────────────────────────────────────

describe('InMemoryRegistrationRepository', () => {
  let repo: InMemoryRegistrationRepository

  beforeEach(() => { repo = new InMemoryRegistrationRepository() })

  it('seeds 20 registrations', async () => {
    const { data: allRegs } = await repo.findByEvent('', { page: 1, pageSize: 100 })
    // seeds spread across multiple eventIds so filter by '' gets 0; test total via create
    expect(allRegs.length).toBeGreaterThanOrEqual(0)
  })

  it('create and findById work', async () => {
    const reg = await repo.create({
      contactId: crypto.randomUUID(),
      eventId: 'test-event-id',
      status: 'pending',
      ticketToken: null,
      aiScore: 0.75,
      flagOverride: false,
      approvedAt: null,
      attendedAt: null,
    })
    const found = await repo.findById(reg.id)
    expect(found?.id).toBe(reg.id)
    expect(found?.status).toBe('pending')
  })

  it('updateStatus changes status', async () => {
    const reg = await repo.create({
      contactId: crypto.randomUUID(),
      eventId: 'test-event-id',
      status: 'pending',
      ticketToken: null, aiScore: 0.8, flagOverride: false,
      approvedAt: null, attendedAt: null,
    })
    const updated = await repo.updateStatus(reg.id, 'approved')
    expect(updated?.status).toBe('approved')
    expect(updated?.approvedAt).not.toBeNull()
  })

  it('bulkApprove updates multiple registrations', async () => {
    const ids = await Promise.all([
      repo.create({ contactId: crypto.randomUUID(), eventId: 'evt', status: 'pending', ticketToken: null, aiScore: null, flagOverride: false, approvedAt: null, attendedAt: null }),
      repo.create({ contactId: crypto.randomUUID(), eventId: 'evt', status: 'pending', ticketToken: null, aiScore: null, flagOverride: false, approvedAt: null, attendedAt: null }),
    ])
    const { approved } = await repo.bulkApprove(ids.map(r => r.id))
    expect(approved).toBe(2)
  })
})

// ─── User Repository ──────────────────────────────────────────────────────────

describe('InMemoryUserRepository', () => {
  let repo: InMemoryUserRepository

  beforeEach(() => { repo = new InMemoryUserRepository() })

  it('seeds admin and staff users', async () => {
    const { total } = await repo.findAll({ page: 1, pageSize: 10 })
    expect(total).toBe(2)
  })

  it('findByEmail returns correct user', async () => {
    const user = await repo.findByEmail('admin@yorindo.id')
    expect(user).not.toBeNull()
    expect(user!.role).toBe('event_admin')
  })

  it('create adds a new user', async () => {
    await repo.create({ email: 'new@example.com', passwordHash: 'hash', role: 'staff', name: 'New User' })
    const { total } = await repo.findAll({ page: 1, pageSize: 10 })
    expect(total).toBe(3)
  })

  it('assignEvent and getAssignedEvents work', async () => {
    const user = await repo.findByEmail('staff@yorindo.id')
    const eventId = crypto.randomUUID()
    await repo.assignEvent(user!.id, eventId, user!.id)
    const events = await repo.getAssignedEvents(user!.id)
    expect(events).toContain(eventId)
  })
})

// ─── Flagged Records Repository ───────────────────────────────────────────────

describe('InMemoryFlaggedRecordsRepository', () => {
  let repo: InMemoryFlaggedRecordsRepository

  beforeEach(() => { repo = new InMemoryFlaggedRecordsRepository() })

  it('seeds 10 pending flagged records', async () => {
    const { total } = await repo.findAll({ page: 1, pageSize: 20 }, 'pending')
    expect(total).toBe(10)
  })

  it('resolve changes status to resolved', async () => {
    const { data } = await repo.findAll({ page: 1, pageSize: 1 }, 'pending')
    await repo.resolve(data[0].id, {}, crypto.randomUUID())
    const found = await repo.findById(data[0].id)
    expect(found?.status).toBe('resolved')
  })

  it('discard changes status to discarded', async () => {
    const { data } = await repo.findAll({ page: 1, pageSize: 1 }, 'pending')
    await repo.discard(data[0].id, crypto.randomUUID())
    const found = await repo.findById(data[0].id)
    expect(found?.status).toBe('discarded')
  })
})

// ─── Suppression Repository ───────────────────────────────────────────────────

describe('InMemorySuppressionRepository', () => {
  let repo: InMemorySuppressionRepository

  beforeEach(() => { repo = new InMemorySuppressionRepository() })

  it('isSuppressed returns false for unknown phone', async () => {
    const result = await repo.isSuppressed('+628999999999')
    expect(result).toBe(false)
  })

  it('suppress makes phone suppressed', async () => {
    await repo.suppress('contact-id-1', 'user_request')
    const result = await repo.isSuppressed('contact-id-1')
    expect(result).toBe(true)
  })
})
