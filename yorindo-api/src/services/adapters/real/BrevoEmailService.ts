import type { IEmailService, EmailPayload } from '../../../interfaces/services/IEmailService.js'
import { config } from '../../../config/index.js'
import { logEmailDelivery } from '../../../lib/email-delivery-logger.js'

export class BrevoEmailService implements IEmailService {
  private readonly BASE_URL = 'https://api.brevo.com/v3'

  async send(payload: EmailPayload): Promise<{ messageId: string }> {
    const response = await fetch(`${this.BASE_URL}/smtp/email`, {
      method: 'POST',
      headers: {
        'api-key': config.brevoApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: { email: 'noreply@emu.app' },
        to: [{ email: payload.to }],
        subject: payload.subject,
        htmlContent: payload.body,
        params: payload.variables ?? {},
      }),
    })
    if (!response.ok) {
      const errorText = await response.text()
      logEmailDelivery({ messageId: 'unknown', to: payload.to, subject: payload.subject, status: 'failed', error: `Brevo API error: ${response.status}`, provider: 'brevo' })
      throw new Error(`Brevo API error: ${response.status} ${errorText}`)
    }
    const data = await response.json() as { messageId?: string }
    const messageId = data.messageId ?? `brevo-${Date.now()}`
    logEmailDelivery({ messageId, to: payload.to, subject: payload.subject, status: 'sent', provider: 'brevo' })
    return { messageId }
  }

  async sendBatch(payloads: EmailPayload[]): Promise<{ sent: number; failed: number }> {
    let sent = 0
    let failed = 0
    for (const payload of payloads) {
      try {
        await this.send(payload)
        sent++
      } catch (err) {
        logEmailDelivery({ messageId: 'unknown', to: payload.to, subject: payload.subject, status: 'failed', error: String(err), provider: 'brevo' })
        failed++
      }
    }
    return { sent, failed }
  }
}
