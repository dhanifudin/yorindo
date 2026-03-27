import type { IWhatsAppService, WhatsAppPayload } from '../../../interfaces/services/IWhatsAppService.js'
import { createId } from '@paralleldrive/cuid2'

export class MockWhatsAppService implements IWhatsAppService {
  private sentMessages: Array<{ payload: WhatsAppPayload; sentAt: string }> = []

  async send(payload: WhatsAppPayload): Promise<{ messageId: string }> {
    this.sentMessages.push({ payload, sentAt: new Date().toISOString() })
    return { messageId: `mock-wa-${createId()}` }
  }

  async sendBatch(payloads: WhatsAppPayload[]): Promise<{ sent: number; failed: number }> {
    for (const p of payloads) await this.send(p)
    return { sent: payloads.length, failed: 0 }
  }

  getSentMessages(): Array<{ payload: WhatsAppPayload; sentAt: string }> {
    return [...this.sentMessages]
  }

  reset(): void {
    this.sentMessages = []
  }
}
