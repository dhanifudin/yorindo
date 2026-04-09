import 'dotenv/config'

function required(key: string): string {
  const val = process.env[key]
  if (!val) throw new Error(`Missing required env var: ${key}`)
  return val
}

function optional(key: string, fallback = ''): string {
  return process.env[key] ?? fallback
}

function buildDatabaseUrl(): string {
  const user = optional('POSTGRES_USER')
  const password = optional('POSTGRES_PASSWORD')
  const host = optional('POSTGRES_HOST', 'localhost')
  const port = optional('POSTGRES_PORT', '5432')
  const db = optional('POSTGRES_DB')
  if (!user || !password || !db) return ''
  return `postgresql://${user}:${encodeURIComponent(password)}@${host}:${port}/${db}`
}

export const config = {
  port: parseInt(optional('PORT', '3000'), 10),
  nodeEnv: optional('NODE_ENV', 'development'),

  // Auth — required (used in Phase 1 JWT middleware)
  jwtSecret: required('JWT_SECRET'),
  jwtRefreshSecret: required('JWT_REFRESH_SECRET'),

  // Service adapter selection — defaults drive Phase 1 (in-memory / mock)
  repositoryImpl: optional('REPOSITORY_IMPL', 'memory'),   // 'memory' | 'postgres'
  serviceImpl: optional('SERVICE_IMPL', 'mock'),           // 'mock' | 'real'
  emailProvider: optional('EMAIL_PROVIDER', 'mock'),       // 'mock' | 'brevo' | 'mailtrap'
  whatsappProvider: optional('WHATSAPP_PROVIDER', 'mock'), // 'mock' | 'everpro'

  // AI provider selection — defaults to mock in Phase 1
  etlAiProvider: optional('ETL_AI_PROVIDER', 'disabled'),
  yorimindAiProvider: optional('YORIMIND_AI_PROVIDER', 'mock'),
  smartFilterAiProvider: optional('SMART_FILTER_AI_PROVIDER', 'mock'),

  // YoriMind AI proxy config (mlapi.run OpenAI-compatible)
  yorimindAiBaseUrl: optional('YORIMIND_AI_BASE_URL'),
  yorimindAiApiKey: optional('YORIMIND_AI_API_KEY'),

  // Phase 2 only — optional strings; empty in Phase 1
  databaseUrl: buildDatabaseUrl(),
  redisUrl: optional('REDIS_URL'),
  snapshotDir: optional('SNAPSHOT_DIR', '/data/snapshots'),
  uploadsDir: optional('UPLOADS_DIR', 'uploads'),

  // External API keys — Phase 2 only; unused in Phase 1
  openaiApiKey: optional('OPENAI_API_KEY'),
  anthropicApiKey: optional('ANTHROPIC_API_KEY'),
  brevoApiKey: optional('BREVO_API_KEY'),
  everproApiKey: optional('EVERPRO_API_KEY'),
  brevoSenderEmail: optional('BREVO_SENDER_EMAIL', 'no-reply@emu.app'),

  // Mailtrap SMTP credentials
  mailtrapHost: optional('MAILTRAP_HOST'),
  mailtrapPort: parseInt(optional('MAILTRAP_PORT', '2525'), 10),
  mailtrapUser: optional('MAILTRAP_USER'),
  mailtrapPass: optional('MAILTRAP_PASS'),

  // Error monitoring — optional; Sentry skips init silently when undefined
  sentryDsn: optional('SENTRY_DSN') || undefined,
} as const
