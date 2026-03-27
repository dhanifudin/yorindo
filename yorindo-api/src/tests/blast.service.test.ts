import { describe, it, expect, beforeEach } from 'vitest'
import { BlastService, type BlastJobData, type AuditEntry, type IAuditLogger } from '../services/blast.service.js'
import { MockEmailService } from '../services/adapters/mock/EmailService.js'
import { MockWhatsAppService } from '../services/adapters/mock/WhatsAppService.js'
import { InMemorySuppressionRepository } from '../repositories/memory/SuppressionRepository.js'
import { InMemoryContactRepository } from '../repositories/memory/ContactRepository.js'
import { InMemoryEventRepository } from '../repositories/memory/EventRepository.js'

class TestAuditLogger implements IAuditLogger {
  entries: AuditEntry[] = []
  async log(entry: AuditEntry): Promise<void> {
    this.entries.push(entry)
  }
}

function makeJob(overrides: Partial<BlastJobData> = {}): BlastJobData {
  return {
    eventId: 'event-001',
    channel: 'email',
    templateId: 'tmpl-001',
    templateBody: 'Halo {{name}}, Anda diundang ke {{event_title}}',
    templateName: 'undangan-event',
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
  let auditLogger: TestAuditLogger
  let blastService: BlastService

  beforeEach(() => {
    emailService = new MockEmailService()
    whatsAppService = new MockWhatsAppService()
    suppressionRepo = new InMemorySuppressionRepository()
    contactRepo = new InMemoryContactRepository()
    eventRepo = new InMemoryEventRepository()
    auditLogger = new TestAuditLogger()
    blastService = new BlastService(
      emailService,
      whatsAppService,
      suppressionRepo,
      contactRepo,
      eventRepo,
      auditLogger,
    )
  })

  it('email channel: send() called for non-suppressed contacts with email', async () => {
    const result = await blastService.processJob(makeJob({ channel: 'email' }))
    const sentEmails = emailService.getSentEmails()
    expect(sentEmails.length).toBeGreaterThan(0)
    expect(result.sentCount).toBeGreaterThan(0)
    expect(result.suppressedCount).toBeGreaterThan(0)
  })

  it('whatsapp channel: WA send() called instead of email', async () => {
    const result = await blastService.processJob(makeJob({ channel: 'whatsapp' }))
    const sentWa = whatsAppService.getSentMessages()
    expect(sentWa.length).toBeGreaterThan(0)
    expect(emailService.getSentEmails().length).toBe(0)
    expect(result.sentCount).toBeGreaterThan(0)
  })

  it('suppressed contact is excluded from delivery', async () => {
    // Get a contact's phone from the seeded repo
    const { data: contacts } = await contactRepo.findAll({ page: 1, pageSize: 1 })
    const suppressedPhone = contacts[0].phone
    await suppressionRepo.suppress(suppressedPhone, 'test suppression')
    // Suppress using phone directly
    await suppressionRepo.suppress(suppressedPhone, 'test')

    const result = await blastService.processJob(makeJob({ channel: 'whatsapp' }))
    expect(result.suppressedCount).toBeGreaterThan(0)
  })

  it('writes blast.initiated audit entry after job', async () => {
    await blastService.processJob(makeJob())
    const initiated = auditLogger.entries.find((e) => e.action === 'blast.initiated')
    expect(initiated).toBeTruthy()
    expect(initiated?.metadata.eventId).toBe('event-001')
    expect(initiated?.metadata.channel).toBe('email')
  })

  it('writes blast.high-failure-rate audit when >5% fail', async () => {
    // Make email service always fail
    let callCount = 0
    const failingEmailService = {
      async send() {
        callCount++
        throw new Error('Brevo rate limit')
      },
      async sendBatch() { return { sent: 0, failed: 0 } },
    }
    const failingBlastService = new BlastService(
      failingEmailService,
      whatsAppService,
      suppressionRepo,
      contactRepo,
      eventRepo,
      auditLogger,
    )
    await failingBlastService.processJob(makeJob({ channel: 'email' }))
    const highFailure = auditLogger.entries.find((e) => e.action === 'blast.high-failure-rate')
    expect(highFailure).toBeTruthy()
    expect(highFailure?.level).toBe('warning')
  })

  it('template variables are substituted per contact', async () => {
    await blastService.processJob(makeJob({
      channel: 'email',
      templateBody: 'Halo {{name}}, acara: {{event_title}}',
    }))
    const emails = emailService.getSentEmails()
    // Check first email has substituted content (not raw {{name}})
    expect(emails[0].payload.body).not.toContain('{{name}}')
  })
})
