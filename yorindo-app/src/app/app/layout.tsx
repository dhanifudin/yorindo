'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { AdminShell } from '@/components/layout/AdminShell'
import { PWAInstallBanner } from '@/components/features/scan/PWAInstallBanner'

// Routes that viewers (read-only) are allowed to access
const VIEWER_ALLOWED_PATHS = ['/app', '/app/events']

function isViewerAllowed(pathname: string): boolean {
  if (VIEWER_ALLOWED_PATHS.includes(pathname)) return true
  if (/^\/app\/events\/[^/]+\/report/.test(pathname)) return true
  if (/^\/app\/events\/[^/]+$/.test(pathname)) return true
  return false
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const accessToken = useAuthStore((s) => s.accessToken)
  const user = useAuthStore((s) => s.user)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!accessToken) {
      router.replace('/login')
      return
    }
    if (user?.role === 'viewer' && !isViewerAllowed(pathname)) {
      router.replace('/app/events')
    }
  }, [accessToken, user, router, pathname])

  if (!accessToken) return null

  return (
    <>
      <AdminShell>{children}</AdminShell>
      <PWAInstallBanner mode="global" />
    </>
  )
}
