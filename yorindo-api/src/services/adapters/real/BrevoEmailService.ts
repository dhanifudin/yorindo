import type { IEmailService, EmailPayload } from '../../../interfaces/services/IEmailService.js'
import { config } from '../../../config/index.js'

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
        sender: { email: config.brevoSenderEmail },
        to: [{ email: payload.to }],
        subject: payload.subject,
        htmlContent: payload.body,
        params: payload.variables ?? {},
      }),
    })
    if (!response.ok) {
      throw new Error(`Brevo API error: ${response.status} ${await response.text()}`)
    }
    const data = await response.json() as { messageId?: string }
    return { messageId: data.messageId ?? `brevo-${Date.now()}` }
  }

  async sendBatch(payloads: EmailPayload[]): Promise<{ sent: number; failed: number }> {
    let sent = 0
    let failed = 0
    for (const payload of payloads) {
      try {
        await this.send(payload)
        sent++
      } catch {
        failed++
      }
    }
    return { sent, failed }
  }
}
