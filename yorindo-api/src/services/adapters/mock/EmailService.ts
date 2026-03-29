import type { IEmailService, EmailPayload } from '../../../interfaces/services/IEmailService.js'
import { createId } from '@paralleldrive/cuid2'

export class MockEmailService implements IEmailService {
  private sentEmails: Array<{ payload: EmailPayload; sentAt: string }> = []

  async send(payload: EmailPayload): Promise<{ messageId: string }> {
    this.sentEmails.push({ payload, sentAt: new Date().toISOString() })
    return { messageId: `mock-email-${createId()}` }
  }

  async sendBatch(payloads: EmailPayload[]): Promise<{ sent: number; failed: number }> {
    for (const p of payloads) await this.send(p)
    return { sent: payloads.length, failed: 0 }
  }

  getSentEmails(): Array<{ payload: EmailPayload; sentAt: string }> {
    return [...this.sentEmails]
  }

  reset(): void {
    this.sentEmails = []
  }
}
