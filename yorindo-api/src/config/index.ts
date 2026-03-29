import 'dotenv/config'

function required(key: string): string {
  const val = process.env[key]
  if (!val) throw new Error(`Missing required env var: ${key}`)
  return val
}

function optional(key: string, fallback = ''): string {
  return process.env[key] ?? fallback
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
  etlAiProvider: optional('ETL_AI_PROVIDER', 'mock'),
  yorimindAiProvider: optional('YORIMIND_AI_PROVIDER', 'mock'),
  smartFilterAiProvider: optional('SMART_FILTER_AI_PROVIDER', 'mock'),

  // Phase 2 only — optional strings; empty in Phase 1
  databaseUrl: optional('DATABASE_URL'),
  redisUrl: optional('REDIS_URL'),
  snapshotDir: optional('SNAPSHOT_DIR', '/data/snapshots'),
  uploadsDir: optional('UPLOADS_DIR', 'uploads'),

  // External API keys — Phase 2 only; unused in Phase 1
  openaiApiKey: optional('OPENAI_API_KEY'),
  anthropicApiKey: optional('ANTHROPIC_API_KEY'),
  brevoApiKey: optional('BREVO_API_KEY'),
  everproApiKey: optional('EVERPRO_API_KEY'),
  brevoSenderEmail: optional('BREVO_SENDER_EMAIL', 'no-reply@yorindo.app'),

  // Error monitoring — optional; Sentry skips init silently when undefined
  sentryDsn: optional('SENTRY_DSN') || undefined,
} as const
