'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Handles the GitHub Pages 404→SPA redirect trick.
 * When a non-pre-rendered URL (e.g. /tickets/real-token) is accessed directly,
 * the 404.html stores the path in sessionStorage and redirects to the app root.
 * This component reads that stored path and restores the correct route.
 */
export function SpaRedirectHandler() {
  const router = useRouter()

  useEffect(() => {
    const redirect = sessionStorage.getItem('spa-redirect')
    if (!redirect) return
    sessionStorage.removeItem('spa-redirect')

    // Strip basePath prefix so Next.js router receives a relative path
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''
    const path = basePath ? redirect.replace(new RegExp(`^${basePath}`), '') : redirect
    if (path && path !== '/') {
      router.replace(path || '/')
    }
  }, [router])

  return null
}
