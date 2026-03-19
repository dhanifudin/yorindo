import withSerwistInit from '@serwist/next'

const isExport = process.env.NEXT_EXPORT === 'true'
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''

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
  turbopack: {}, // serwist adds a webpack config internally; empty turbopack config silences the Next.js 16 warning
}

export default isExport ? nextConfig : withSerwist(nextConfig)
