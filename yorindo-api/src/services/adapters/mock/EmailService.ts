import type { IEmailService, EmailPayload } from '../../../interfaces/services/IEmailService.js'
import { createId } from '@paralleldrive/cuid2'
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

export class MockEmailService implements IEmailService {
  private sentEmails: Array<{ payload: EmailPayload; sentAt: string }> = []

  async send(payload: EmailPayload): Promise<{ messageId: string }> {
    const messageId = `mock-email-${createId()}`
    this.sentEmails.push({ payload, sentAt: new Date().toISOString() })
    logDelivery({ messageId, to: payload.to, subject: payload.subject, status: 'sent' })
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
        logDelivery({ messageId, to: p.to, subject: p.subject, status: 'failed', error: String(err) })
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
