'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * GitHub Pages SPA redirect handler.
 * When GitHub Pages serves this 404 page for an unknown URL (e.g. /tickets/real-token-123),
 * this component detects the actual intended path and restores it via client-side navigation.
 * This handles dynamic token routes that couldn't be pre-rendered at build time.
 */
export default function NotFound() {
  const router = useRouter()

  useEffect(() => {
    const l = window.location
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''
    // Strip basePath prefix to get the app-relative path
    const appPath = basePath ? l.pathname.replace(new RegExp(`^${basePath}`), '') : l.pathname
    const fullPath = (appPath || '/') + l.search + l.hash

    if (fullPath && fullPath !== '/') {
      router.replace(fullPath)
    }
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-muted-foreground text-sm">Memuat...</p>
    </div>
  )
}
