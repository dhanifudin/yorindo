import type { IEmailService, EmailPayload } from '../../../interfaces/services/IEmailService.js'
import { config } from '../../../config/index.js'
import { appendFileSync, mkdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const LOG_DIR = join(__dirname, '..', '..', '..', 'logs')
const LOG_FILE = join(LOG_DIR, 'email-delivery.log')

function ensureLogDir() {
  if (!existsSync(LOG_DIR)) mkdirSync(LOG_DIR, { recursive: true })
}

function logDelivery(entry: { messageId: string; to: string; subject: string; status: string; error?: string }) {
  ensureLogDir()
  const line = JSON.stringify({ ...entry, timestamp: new Date().toISOString() })
  appendFileSync(LOG_FILE, line + '\n')
}

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
      const errorText = await response.text()
      logDelivery({ messageId: 'unknown', to: payload.to, subject: payload.subject, status: 'failed', error: `Brevo API error: ${response.status}` })
      throw new Error(`Brevo API error: ${response.status} ${errorText}`)
    }
    const data = await response.json() as { messageId?: string }
    const messageId = data.messageId ?? `brevo-${Date.now()}`
    logDelivery({ messageId, to: payload.to, subject: payload.subject, status: 'sent' })
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
        logDelivery({ messageId: 'unknown', to: payload.to, subject: payload.subject, status: 'failed', error: String(err) })
        failed++
      }
    }
    return { sent, failed }
  }
}
