import type { IWhatsAppService, WhatsAppPayload } from '../../../interfaces/services/IWhatsAppService.js'
import { config } from '../../../config/index.js'

export class EverproWhatsAppService implements IWhatsAppService {
  private readonly BASE_URL = 'https://api.everpro.id/v1'

  async send(payload: WhatsAppPayload): Promise<{ messageId: string }> {
    const response = await fetch(`${this.BASE_URL}/messages/send`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.everproApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: payload.to,
        type: 'template',
        template: {
          name: payload.templateName,
          language: { code: 'id' },
          components: payload.variables
            ? [{
                type: 'body',
                parameters: Object.values(payload.variables).map((v) => ({ type: 'text', text: v })),
              }]
            : [],
        },
        text: payload.body,
      }),
    })
    if (!response.ok) {
      throw new Error(`Everpro API error: ${response.status} ${await response.text()}`)
    }
    const data = await response.json() as { messageId?: string; id?: string }
    return { messageId: data.messageId ?? data.id ?? `everpro-${Date.now()}` }
  }

  async sendBatch(payloads: WhatsAppPayload[]): Promise<{ sent: number; failed: number }> {
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
