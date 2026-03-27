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
}

export default isExport ? nextConfig : withSerwist(nextConfig)
