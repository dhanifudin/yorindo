import { readFileSync } from 'node:fs'
import path from 'node:path'
import { parse } from 'yaml'

type OpenApiDocument = {
  openapi?: string
  info?: Record<string, unknown>
  paths?: Record<string, unknown>
}

const REQUIRED_PATHS = [
  '/health',
  '/auth/login',
  '/contacts',
  '/events',
  '/registrations',
  '/scan/verify',
  '/users',
] as const

let cachedDocument: OpenApiDocument | null = null

export function loadOpenApiDocument(): OpenApiDocument {
  if (cachedDocument) return cachedDocument

  const filePath = path.resolve(process.cwd(), 'openapi.yaml')
  const raw = readFileSync(filePath, 'utf8')
  const document = parse(raw) as OpenApiDocument

  if (!document?.openapi || !document?.paths) {
    throw new Error('Invalid OpenAPI document: missing `openapi` version or `paths`')
  }

  const missing = REQUIRED_PATHS.filter((route) => !(route in document.paths!))
  if (missing.length > 0) {
    throw new Error(`OpenAPI contract is missing required foundation paths: ${missing.join(', ')}`)
  }

  cachedDocument = document
  return document
}
