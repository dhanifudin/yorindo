import { describe, it, expect, beforeEach } from 'vitest'
import { BlastService, type BlastJobData } from '../services/blast.service.js'
import { MockEmailService } from '../services/adapters/mock/EmailService.js'
import { MockWhatsAppService } from '../services/adapters/mock/WhatsAppService.js'
import { InMemorySuppressionRepository } from '../repositories/memory/SuppressionRepository.js'
import { InMemoryContactRepository } from '../repositories/memory/ContactRepository.js'
import { InMemoryEventRepository } from '../repositories/memory/EventRepository.js'
import { InMemoryTemplateRepository } from '../repositories/memory/TemplateRepository.js'
import type { IAuditLogRepository } from '../interfaces/repositories/IAuditLogRepository.js'
import type { AuditLog } from '../types/domain.js'

class TestAuditLogRepository implements IAuditLogRepository {
  entries: AuditLog[] = []

  async create(data: Omit<AuditLog, 'id' | 'createdAt'>): Promise<AuditLog> {
    const entry: AuditLog = {
      ...data,
      id: `audit-${this.entries.length + 1}`,
      createdAt: new Date().toISOString(),
    }
    this.entries.push(entry)
    return entry
  }

  async findAllByTarget(targetId: string): Promise<AuditLog[]> {
    return this.entries.filter((entry) => entry.targetId === targetId)
  }
}

function makeJob(overrides: Partial<BlastJobData> = {}): BlastJobData {
  return {
    eventId: 'event-001',
    channel: 'email',
    templateId: 'tmpl-001',
    templateBody: 'Hello {{name}}',
    templateName: 'Test Template',
    enqueuedBy: 'user-001',
    ...overrides,
  }
}

describe('BlastService', () => {
  let emailService: MockEmailService
  let whatsAppService: MockWhatsAppService
  let suppressionRepo: InMemorySuppressionRepository
  let contactRepo: InMemoryContactRepository
  let eventRepo: InMemoryEventRepository
  let templateRepo: InMemoryTemplateRepository
  let auditLogRepository: TestAuditLogRepository
  let blastService: BlastService

  beforeEach(() => {
    emailService = new MockEmailService()
    whatsAppService = new MockWhatsAppService()
    suppressionRepo = new InMemorySuppressionRepository()
    contactRepo = new InMemoryContactRepository()
    eventRepo = new InMemoryEventRepository()
    templateRepo = new InMemoryTemplateRepository()
    auditLogRepository = new TestAuditLogRepository()
    blastService = new BlastService(
      emailService,
      whatsAppService,
      suppressionRepo,
      contactRepo,
      eventRepo,
      templateRepo,
      auditLogRepository,
      async () => undefined,
      0, // no delay in tests
    )
  })

  it('email channel sends only to non-suppressed contacts with email', async () => {
    const { data: contacts } = await contactRepo.findAll({ page: 1, pageSize: 20 })
    const contact = contacts.find((c) => c.email !== null)!
    await suppressionRepo.suppress(contact.id, 'test_suppression', { email: contact.email })

    const result = await blastService.processJob(makeJob({ channel: 'email' }))

    const sentEmails = emailService.getSentEmails()
    expect(sentEmails.length).toBeGreaterThan(0)
    expect(result.sentCount).toBe(sentEmails.length)
    expect(result.suppressedCount).toBeGreaterThan(0)
  })

  it('whatsapp channel sends messages to the selected contactIds only', async () => {
    const { data: contacts } = await contactRepo.findAll({ page: 1, pageSize: 3 })
    const selected = contacts.slice(0, 2).map((contact) => contact.id)

    const result = await blastService.processJob(makeJob({
      channel: 'whatsapp',
      contactIds: selected,
    }))

    const sentMessages = whatsAppService.getSentMessages()
    expect(result.recipientCount + result.suppressedCount).toBe(selected.length)
    expect(sentMessages.every((message) => selected.includes(
      contacts.find((contact) => contact.phone === message.payload.to)?.id ?? '',
    ))).toBe(true)
  })

  it('suppressed contacts are excluded from delivery', async () => {
    const { data: contacts } = await contactRepo.findAll({ page: 1, pageSize: 1 })
    const contact = contacts[0]!
    await suppressionRepo.suppress(contact.id, 'manual suppression', { 
      phone: contact.phone, 
      email: contact.email 
    })

    const result = await blastService.processJob(makeJob({ channel: 'whatsapp' }))

    expect(result.suppressedCount).toBeGreaterThan(0)
  })

  it('email-only suppression is enforced for email blasts', async () => {
    const { data: contacts } = await contactRepo.findAll({ page: 1, pageSize: 20 })
    const contactWithEmail = contacts.find((contact) => contact.email !== null)!
    await suppressionRepo.suppress('manual-email-suppression', 'manually_added', {
      email: contactWithEmail.email,
    })

    const beforeCount = emailService.getSentEmails().length
    const result = await blastService.processJob(makeJob({ channel: 'email' }))
    const matchingEmail = emailService.getSentEmails().find(
      (item) => item.payload.to === contactWithEmail.email,
    )

    expect(matchingEmail).toBeUndefined()
    expect(emailService.getSentEmails().length).toBeGreaterThanOrEqual(beforeCount)
    expect(result.suppressedCount).toBeGreaterThan(0)
  })

  it('writes blast.initiated audit entry after job', async () => {
    await blastService.processJob(makeJob())

    const initiated = auditLogRepository.entries.find((entry) => entry.action === 'blast.initiated')
    expect(initiated).toBeTruthy()
    expect(initiated?.metadata?.['templateId']).toBe('tmpl-001')
    expect(initiated?.eventId).toBe('event-001')
  })

  it('writes blast.high-failure-rate audit when more than 5% fail', async () => {
    const failingEmailService = {
      async send() {
        throw new Error('Brevo rate limit')
      },
      async sendBatch() {
        return { sent: 0, failed: 0 }
      },
    }

    const failingBlastService = new BlastService(
      failingEmailService,
      whatsAppService,
      suppressionRepo,
      contactRepo,
      eventRepo,
      templateRepo,
      auditLogRepository,
      async () => undefined,
      0, // no delay in tests
    )

    await failingBlastService.processJob(makeJob({ channel: 'email' }))

    const highFailure = auditLogRepository.entries.find((entry) => entry.action === 'blast.high-failure-rate')
    expect(highFailure).toBeTruthy()
    expect(highFailure?.metadata?.['failureRate']).toBeGreaterThan(5)
  })

  it('substitutes template variables in email body', async () => {
    await blastService.processJob(makeJob({
      channel: 'email',
      contactIds: ['cuid2contact000000000003'],
    }))

    const emails = emailService.getSentEmails()
    expect(emails).toHaveLength(1)
    expect(emails[0]?.payload.body).toContain('Anda diundang ke')
    expect(emails[0]?.payload.body).not.toContain('{{name}}')
    expect(emails[0]?.payload.body).not.toContain('{{event_title}}')
  })
})
