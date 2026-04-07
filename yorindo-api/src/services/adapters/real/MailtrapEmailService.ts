import type { IEmailService, EmailPayload } from '../../../interfaces/services/IEmailService.js'
import { config } from '../../../config/index.js'
import { logEmailDelivery } from '../../../lib/email-delivery-logger.js'

export class MailtrapEmailService implements IEmailService {
  private readonly BASE_URL = 'https://send.api.mailtrap.io'

  async send(payload: EmailPayload): Promise<{ messageId: string }> {
    const response = await fetch(`${this.BASE_URL}/api/send`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.mailtrapApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: { email: config.brevoSenderEmail ?? 'noreply@yorindo.app', name: 'Yorindo' },
        to: [{ email: payload.to }],
        subject: payload.subject,
        html: payload.body,
        category: 'blast',
      }),
    })
    if (!response.ok) {
      const errorText = await response.text()
      logEmailDelivery({ messageId: 'unknown', to: payload.to, subject: payload.subject, status: 'failed', error: `Mailtrap API error: ${response.status}`, provider: 'mailtrap' })
      throw new Error(`Mailtrap API error: ${response.status} ${errorText}`)
    }
    const data = await response.json() as { message_ids?: string[] }
    const messageId = data.message_ids?.[0] ?? `mailtrap-${Date.now()}`
    logEmailDelivery({ messageId, to: payload.to, subject: payload.subject, status: 'sent', provider: 'mailtrap' })
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
        logEmailDelivery({ messageId: 'unknown', to: payload.to, subject: payload.subject, status: 'failed', error: String(err), provider: 'mailtrap' })
        failed++
      }
    }
    return { sent, failed }
  }
}
