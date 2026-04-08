import type { IEmailService, EmailPayload } from '../../../interfaces/services/IEmailService.js'
import { createId } from '@paralleldrive/cuid2'
import { logEmailDelivery } from '../../../lib/email-delivery-logger.js'

export class MockEmailService implements IEmailService {
  private sentEmails: Array<{ payload: EmailPayload; sentAt: string }> = []

  async send(payload: EmailPayload): Promise<{ messageId: string }> {
    const messageId = `mock-email-${createId()}`
    this.sentEmails.push({ payload, sentAt: new Date().toISOString() })
    logEmailDelivery({ messageId, to: payload.to, subject: payload.subject, status: 'sent', provider: 'mock' })
    return { messageId }
  }

  async sendBatch(payloads: EmailPayload[]): Promise<{ sent: number; failed: number }> {
    let sent = 0
    let failed = 0
    for (const p of payloads) {
      try {
        await this.send(p)
        sent++
      } catch (err) {
        const messageId = `mock-email-${createId()}`
        logEmailDelivery({ messageId, to: p.to, subject: p.subject, status: 'failed', error: String(err), provider: 'mock' })
        failed++
      }
    }
    return { sent, failed }
  }

  getSentEmails(): Array<{ payload: EmailPayload; sentAt: string }> {
    return [...this.sentEmails]
  }

  reset(): void {
    this.sentEmails = []
  }
}
