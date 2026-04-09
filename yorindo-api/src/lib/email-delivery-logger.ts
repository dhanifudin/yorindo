import { appendFileSync, mkdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// In Docker, write to /app/logs (which can be a mounted volume).
// In local dev, write to yorindo-api/logs.
const LOG_DIR = process.env.NODE_ENV === 'production'
  ? '/app/logs'
  : join(__dirname, '..', '..', 'logs')
const LOG_FILE = join(LOG_DIR, 'email-delivery.log')

function ensureLogDir() {
  if (!existsSync(LOG_DIR)) mkdirSync(LOG_DIR, { recursive: true })
}

/**
 * Log email delivery to both stdout (Docker logs) and file.
 * stdout output is captured by `docker logs` and docker-compose logs.
 * File output persists to a mounted volume for long-term audit.
 */
export function logEmailDelivery(entry: {
  messageId: string
  to: string
  subject: string
  status: 'sent' | 'failed'
  error?: string
  provider?: string
}) {
  const logEntry = { ...entry, timestamp: new Date().toISOString() }

  // stdout — captured by Docker automatically
  const statusIcon = entry.status === 'sent' ? '✓' : '✗'
  console.log(`[email-delivery] ${statusIcon} ${entry.to} — ${entry.subject} (${entry.status})${entry.error ? ` — ${entry.error}` : ''}`)

  // file — persists to volume
  try {
    ensureLogDir()
    appendFileSync(LOG_FILE, JSON.stringify(logEntry) + '\n')
  } catch (err) {
    // If file write fails (e.g. read-only filesystem), still log to stdout
    console.error('[email-delivery] Failed to write log file:', err)
  }
}
