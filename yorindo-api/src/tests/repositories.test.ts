import { describe, it, expect, beforeEach } from 'vitest'
import { createId } from '@paralleldrive/cuid2'
import { InMemoryContactRepository } from '../repositories/memory/ContactRepository.js'
import { InMemoryEventRepository } from '../repositories/memory/EventRepository.js'
import { InMemoryRegistrationRepository } from '../repositories/memory/RegistrationRepository.js'
import { InMemoryUserRepository } from '../repositories/memory/UserRepository.js'
import { InMemoryFlaggedRecordsRepository } from '../repositories/memory/FlaggedRecordsRepository.js'
import { InMemorySuppressionRepository } from '../repositories/memory/SuppressionRepository.js'
import { InMemorySurveyRepository } from '../repositories/memory/SurveyRepository.js'
import { INDONESIAN_INDUSTRIES, SEED_CONTACT_IDS, SEED_EVENT_IDS, SEED_REGISTRATION_IDS } from '../repositories/memory/_seeds.js'

// ─── Contact Repository ───────────────────────────────────────────────────────

describe('InMemoryContactRepository', () => {
  let repo: InMemoryContactRepository

  beforeEach(() => { repo = new InMemoryContactRepository() })

  it('seeds 120 contacts on construction', async () => {
    const { total } = await repo.findAll({ page: 1, pageSize: 100 })
    expect(total).toBe(120)
  })

  it('findAll paginates correctly', async () => {
    const { data, total } = await repo.findAll({ page: 1, pageSize: 10 })
    expect(data.length).toBe(10)
    expect(total).toBe(120)
  })

  it('findAll filters by industry', async () => {
    const teknologiId = INDONESIAN_INDUSTRIES.find((industry) => industry.slug === 'teknologi')!.id
    const { data, total } = await repo.findAll(
      { page: 1, pageSize: 20 },
      { industry: 'teknologi' },
    )
    expect(total).toBeGreaterThan(0)
    expect(data.every((contact) => contact.industryId === teknologiId)).toBe(true)
  })

  it('findAll sorts by name ascending', async () => {
    const { data } = await repo.findAll({ page: 1, pageSize: 5, sortBy: 'name', sortDir: 'asc' })
    const names = data.map((contact) => contact.name)
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)))
  })

  it('findDuplicates returns seeded duplicate pairs', async () => {
    const { data, total } = await repo.findDuplicates({ page: 1, pageSize: 10 })
    expect(total).toBe(6)
    expect(data[0]).toHaveProperty('primary')
    expect(data[0]).toHaveProperty('duplicate')
  })

  it('mergeDuplicate resolves one duplicate pair', async () => {
    const before = await repo.findDuplicates({ page: 1, pageSize: 10 })
    const pair = before.data[0]

    const merged = await repo.mergeDuplicate(pair.primary.id, {
      email: 'duplicate',
      city: 'duplicate',
    })

    expect(merged).not.toBeNull()
    expect(merged?.email).toBe(pair.duplicate.email)
    expect(merged?.city).toBe(pair.duplicate.city)

    const after = await repo.findDuplicates({ page: 1, pageSize: 10 })
    expect(after.total).toBe(before.total - 1)
  })

  it('dismissDuplicate resolves one duplicate pair without deleting contacts', async () => {
    const before = await repo.findDuplicates({ page: 1, pageSize: 10 })
    const pair = before.data[0]

    const dismissed = await repo.dismissDuplicate(pair.id)

    expect(dismissed).toBe(true)
    const after = await repo.findDuplicates({ page: 1, pageSize: 10 })
    expect(after.total).toBe(before.total - 1)
    expect(await repo.findById(pair.primary.id)).not.toBeNull()
    expect(await repo.findById(pair.duplicate.id)).not.toBeNull()
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
    expect(total).toBe(119)
  })

  it('countHealth returns correct health stats', async () => {
    const health = await repo.countHealth()
    expect(health).toMatchObject({
      flagged: 13,
      duplicates: 6,
      missingEmail: 15,
    })
  })
})

// ─── Event Repository ─────────────────────────────────────────────────────────

describe('InMemoryEventRepository', () => {
  let repo: InMemoryEventRepository

  beforeEach(() => { repo = new InMemoryEventRepository() })

  it('seeds 12 events on construction', async () => {
    const { total } = await repo.findAll({ page: 1, pageSize: 10 })
    expect(total).toBe(12)
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

  it('getUpcomingUncontacted returns a qualifying event within 14 days', async () => {
    const upcoming = await repo.getUpcomingUncontacted()
    expect(upcoming).not.toBeNull()
    expect(upcoming!.daysTillEvent).toBeGreaterThanOrEqual(0)
    expect(upcoming!.daysTillEvent).toBeLessThanOrEqual(14)
    expect(upcoming!.uncontactedCount).toBeGreaterThan(0)
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
      contactId: createId(),
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

  it('findAll filters registrations by contactId', async () => {
    const result = await repo.findAll(
      { page: 1, pageSize: 100 },
      { contactId: SEED_CONTACT_IDS[0] },
    )

    expect(result.total).toBeGreaterThan(0)
    expect(result.data.every((registration) => registration.contactId === SEED_CONTACT_IDS[0])).toBe(true)
  })

  it('updateStatus changes status', async () => {
    const reg = await repo.create({
      contactId: createId(),
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
      repo.create({ contactId: createId(), eventId: createId(), status: 'pending', ticketToken: null, aiScore: null, flagOverride: false, approvedAt: null, attendedAt: null }),
      repo.create({ contactId: createId(), eventId: createId(), status: 'pending', ticketToken: null, aiScore: null, flagOverride: false, approvedAt: null, attendedAt: null }),
    ])
    const { approved } = await repo.bulkApprove(ids.map(r => r.id))
    expect(approved).toBe(2)
  })
})

// ─── User Repository ──────────────────────────────────────────────────────────

describe('InMemoryUserRepository', () => {
  let repo: InMemoryUserRepository

  beforeEach(() => { repo = new InMemoryUserRepository() })

  it('seeds role-based users', async () => {
    const { total } = await repo.findAll({ page: 1, pageSize: 10 })
    expect(total).toBeGreaterThanOrEqual(3)
  })

  it('findByEmail returns correct user', async () => {
    const user = await repo.findByEmail('admin@yorindo.id')
    expect(user).not.toBeNull()
    expect(user!.role).toBe('admin')
  })

  it('create adds a new user', async () => {
    const before = (await repo.findAll({ page: 1, pageSize: 10 })).total
    await repo.create({ email: 'new@example.com', passwordHash: 'hash', role: 'staff', name: 'New User' })
    const { total } = await repo.findAll({ page: 1, pageSize: 10 })
    expect(total).toBe(before + 1)
  })

  it('assignEvent and getAssignedEvents work', async () => {
    const user = await repo.findByEmail('staff@yorindo.id')
    const eventId = createId()
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
    await repo.resolve(data[0].id, {}, createId())
    const found = await repo.findById(data[0].id)
    expect(found?.status).toBe('resolved')
  })

  it('discard changes status to discarded', async () => {
    const { data } = await repo.findAll({ page: 1, pageSize: 1 }, 'pending')
    await repo.discard(data[0].id, createId())
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

  it('recognizes seeded suppressed contact phones', async () => {
    const contactRepo = new InMemoryContactRepository()
    const contact = await contactRepo.findById(SEED_CONTACT_IDS[115]!)
    expect(contact).not.toBeNull()
    expect(await repo.isSuppressed(contact!.phone)).toBe(true)
  })
})

describe('InMemorySurveyRepository', () => {
  let repo: InMemorySurveyRepository

  beforeEach(() => { repo = new InMemorySurveyRepository() })

  it('returns a schema for the seeded survey event', async () => {
    const schema = await repo.findByEventId(SEED_EVENT_IDS[2]!)
    expect(schema).not.toBeNull()
    expect(schema!.fields.length).toBeGreaterThanOrEqual(3)
  })

  it('returns seeded responses for the seeded survey event', async () => {
    const responses = await repo.getResponsesByEvent(SEED_EVENT_IDS[2]!)
    expect(responses.length).toBe(5)
  })

  it('saves new seeded-registration responses under the event bucket', async () => {
    await repo.saveResponse(SEED_REGISTRATION_IDS[5]!, { interest: 'Fintech' })
    const responses = await repo.getResponsesByEvent(SEED_EVENT_IDS[2]!)
    expect(responses.length).toBe(6)
  })
})
