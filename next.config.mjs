import { withSentryConfig } from '@sentry/nextjs'
import withSerwistInit from '@serwist/next'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const isExport = process.env.NEXT_EXPORT === 'true'
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''
const workspaceRoot = path.dirname(fileURLToPath(import.meta.url))

const withSerwist = withSerwistInit({
  swSrc: 'src/app/sw.ts',
  swDest: 'public/sw.js',
  disable: process.env.NODE_ENV === 'development' || isExport,
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: isExport ? 'export' : 'standalone',
  ...(isExport && { trailingSlash: true }),
  ...(basePath && { basePath }),
  ...(isExport && { images: { unoptimized: true } }),
  turbopack: {
    root: workspaceRoot,
  }, // keep Turbopack scoped to yorindo-app so it does not infer the repo root from sibling lockfiles
  // Proxy /api/* to Fastify — used in local dev and standalone deployments.
  // In production the nginx reverse proxy handles routing before Next.js sees the request.
  async rewrites() {
    const apiUrl = process.env.API_URL ?? 'http://localhost:3000'
    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/api/:path*`,
      },
    ]
  },
}

const baseConfig = isExport ? nextConfig : withSerwist(nextConfig)

export default withSentryConfig(baseConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Upload more client files for readable stack traces
  widenClientFileUpload: true,

  // Proxy Sentry requests through /monitoring to bypass ad-blockers
  tunnelRoute: '/monitoring',

  // Only log during CI builds
  silent: !process.env.CI,

  // Note: tree-shaking options are webpack-only and intentionally omitted — this project uses Turbopack
})
