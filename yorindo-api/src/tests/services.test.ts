import { describe, it, expect, beforeEach } from 'vitest'
import { MockEmailService } from '../services/adapters/mock/EmailService.js'
import { MockWhatsAppService } from '../services/adapters/mock/WhatsAppService.js'
import { MockEtlNormalizationService } from '../services/adapters/mock/EtlNormalizationService.js'
import { MockYoriMindService } from '../services/adapters/mock/YoriMindService.js'
import { MockQueueService } from '../services/adapters/mock/QueueService.js'
import { MockOtpService } from '../services/adapters/mock/OtpService.js'

// ─── MockEmailService ─────────────────────────────────────────────────────────

describe('MockEmailService', () => {
  let svc: MockEmailService

  beforeEach(() => { svc = new MockEmailService() })

  it('send records the call and returns messageId', async () => {
    const result = await svc.send({ to: 'a@b.com', subject: 'Test', body: 'Hello' })
    expect(result.messageId).toMatch(/^mock-email-/)
    expect(svc.getSentEmails()).toHaveLength(1)
    expect(svc.getSentEmails()[0].payload.to).toBe('a@b.com')
  })

  it('sendBatch sends all and returns counts', async () => {
    const result = await svc.sendBatch([
      { to: 'a@b.com', subject: 'S', body: 'B' },
      { to: 'c@d.com', subject: 'S', body: 'B' },
    ])
    expect(result.sent).toBe(2)
    expect(result.failed).toBe(0)
    expect(svc.getSentEmails()).toHaveLength(2)
  })

  it('reset clears sent emails', async () => {
    await svc.send({ to: 'a@b.com', subject: 'S', body: 'B' })
    svc.reset()
    expect(svc.getSentEmails()).toHaveLength(0)
  })
})

// ─── MockWhatsAppService ──────────────────────────────────────────────────────

describe('MockWhatsAppService', () => {
  let svc: MockWhatsAppService

  beforeEach(() => { svc = new MockWhatsAppService() })

  it('send records message and returns messageId', async () => {
    const result = await svc.send({ to: '+628123456789', templateName: 'invitation' })
    expect(result.messageId).toMatch(/^mock-wa-/)
    expect(svc.getSentMessages()).toHaveLength(1)
  })

  it('reset clears messages', async () => {
    await svc.send({ to: '+628', templateName: 'test' })
    svc.reset()
    expect(svc.getSentMessages()).toHaveLength(0)
  })
})

// ─── MockEtlNormalizationService ──────────────────────────────────────────────

describe('MockEtlNormalizationService', () => {
  let svc: MockEtlNormalizationService

  beforeEach(() => { svc = new MockEtlNormalizationService() })

  it('returns one NormalizedRow per input row', async () => {
    const rows = [
      { name: 'Budi', phone: '081234567890', email: 'budi@test.com' },
      { name: 'Sari', phone: '082345678901', email: null },
    ]
    const result = await svc.normalizeBatch(rows)
    expect(result).toHaveLength(2)
    expect(result[0].phone).toMatch(/^\+62/)
  })

  it('normalizes phone from 08x to +62x format', async () => {
    const result = await svc.normalizeBatch([{ phone: '081234567890', name: 'Test' }])
    expect(result[0].phone).toBe('+6281234567890')
  })

  it('most rows have confidence >= 0.7', async () => {
    const rows = Array.from({ length: 20 }, (_, i) => ({ name: `Contact ${i}`, phone: `0812345${i}` }))
    const result = await svc.normalizeBatch(rows)
    const highConfidence = result.filter(r => r.confidence >= 0.7).length
    expect(highConfidence).toBeGreaterThan(10)  // at least 50%+ are high confidence
  })
})

// ─── MockYoriMindService ──────────────────────────────────────────────────────

describe('MockYoriMindService', () => {
  let svc: MockYoriMindService

  beforeEach(() => { svc = new MockYoriMindService() })

  it('returns a YoriMindResult in Indonesian', async () => {
    const result = await svc.analyze({
      eventId: '1',
      eventName: 'Test Event',
      eventDate: new Date().toISOString(),
      capacity: 100,
      registrationCount: 80,
      approvedCount: 60,
      attendedCount: 50,
      conversionRate: 0.625,
      registrations: [],
    })
    expect(result.summary).toContain('Test Event')
    expect(result.insights).toHaveLength(3)
    expect(result.recommendations).toHaveLength(3)
    expect(result.generatedAt).toBeTruthy()
  })
})

// ─── MockQueueService ─────────────────────────────────────────────────────────

describe('MockQueueService', () => {
  let svc: MockQueueService

  beforeEach(() => { svc = new MockQueueService() })

  it('enqueue records job and returns jobId', async () => {
    const jobId = await svc.enqueue('marketing', { type: 'blast', eventId: '1' })
    expect(jobId).toMatch(/^mock-job-/)
    expect(svc.getEnqueuedJobs()).toHaveLength(1)
    expect(svc.getEnqueuedJobs()[0].queueName).toBe('marketing')
  })

  it('getStatus returns queued for known jobId', async () => {
    const jobId = await svc.enqueue('transactional', { type: 'ticket' })
    const status = await svc.getStatus(jobId)
    expect(status).toBe('queued')
  })

  it('getStatus returns failed for unknown jobId', async () => {
    const status = await svc.getStatus('not-a-real-job')
    expect(status).toBe('failed')
  })

  it('reset clears all jobs', async () => {
    await svc.enqueue('otp', { phone: '+628' })
    svc.reset()
    expect(svc.getEnqueuedJobs()).toHaveLength(0)
  })
})

// ─── MockOtpService ───────────────────────────────────────────────────────────

describe('MockOtpService', () => {
  let svc: MockOtpService

  beforeEach(() => { svc = new MockOtpService() })

  it('send records OTP and returns token', async () => {
    const result = await svc.send('+628123456789')
    expect(result.token).toBe('123456')
    expect(svc.getSentOtps()).toHaveLength(1)
  })

  it('verify succeeds with correct OTP', async () => {
    await svc.send('+628123456789')
    const result = await svc.verify('+628123456789', '123456')
    expect(result.valid).toBe(true)
  })

  it('verify fails with wrong OTP', async () => {
    await svc.send('+628123456789')
    const result = await svc.verify('+628123456789', '000000')
    expect(result.valid).toBe(false)
  })
})
