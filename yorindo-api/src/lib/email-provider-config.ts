/**
 * Email Provider Configuration
 *
 * Reads email provider settings from the database with 5-second cache.
 * Used by container.ts to resolve the correct email service at runtime.
 */
import { getPool } from '../repositories/postgres/pool.js'

interface EmailProviderConfig {
  provider: 'brevo' | 'smtp' | 'mock'
  // Brevo
  brevoApiKey: string | null
  brevoSenderEmail: string | null
  // SMTP
  smtpHost: string | null
  smtpPort: number
  smtpSecure: boolean
  smtpUser: string | null
  smtpPass: string | null
  // Sender
  senderName: string | null
  senderEmail: string | null
}

let _cache: EmailProviderConfig | null = null
let _cacheExpiry = 0
const CACHE_TTL = 5000 // 5 seconds

export async function getProviderConfig(): Promise<EmailProviderConfig> {
  const now = Date.now()
  if (_cache && now < _cacheExpiry) {
    return _cache
  }

  const config = await fetchProviderConfig()
  _cache = config
  _cacheExpiry = now + CACHE_TTL
  return config
}

export function clearProviderConfigCache(): void {
  _cache = null
  _cacheExpiry = 0
}

async function fetchProviderConfig(): Promise<EmailProviderConfig> {
  const pool = getPool()
  const { rows } = await pool.query(
    "SELECT key, value FROM settings WHERE key IN ('EMAIL_PROVIDER', 'BREVO_API_KEY', 'BREVO_SENDER_EMAIL', 'SMTP_HOST', 'SMTP_PORT', 'SMTP_SECURE', 'SMTP_USER', 'SMTP_PASS', 'SENDER_NAME', 'SENDER_EMAIL')",
  )

  const map: Record<string, string | null> = {}
  for (const row of rows) {
    map[row.key] = row.value
  }

  const provider = (map.EMAIL_PROVIDER ?? 'smtp') as 'brevo' | 'smtp' | 'mock'
  const smtpPort = map.SMTP_PORT ? parseInt(map.SMTP_PORT, 10) : 587

  return {
    provider,
    brevoApiKey: map.BREVO_API_KEY ?? null,
    brevoSenderEmail: map.BREVO_SENDER_EMAIL ?? null,
    smtpHost: map.SMTP_HOST ?? null,
    smtpPort: isNaN(smtpPort) ? 587 : smtpPort,
    smtpSecure: map.SMTP_SECURE === 'true',
    smtpUser: map.SMTP_USER ?? null,
    smtpPass: map.SMTP_PASS ?? null,
    senderName: map.SENDER_NAME ?? null,
    senderEmail: map.BREVO_SENDER_EMAIL ?? map.SENDER_EMAIL ?? null,
  }
}
