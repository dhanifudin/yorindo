'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore, useAuthHydrated } from '@/store/authStore'
import { AdminShell } from '@/components/layout/AdminShell'
import { ParticipantShell } from '@/components/layout/ParticipantShell'
import { PWAInstallBanner } from '@/components/features/scan/PWAInstallBanner'

// Routes that viewers (read-only) are allowed to access
const VIEWER_ALLOWED_PATHS = ['/app', '/app/events']
const STAFF_ALLOWED_PATHS = ['/app', '/app/scan']

function isViewerAllowed(pathname: string): boolean {
  if (VIEWER_ALLOWED_PATHS.includes(pathname)) return true
  if (/^\/app\/events\/[^/]+\/report$/.test(pathname)) return true
  if (/^\/app\/events\/[^/]+$/.test(pathname)) return true
  return false
}

function isStaffAllowed(pathname: string): boolean {
  if (STAFF_ALLOWED_PATHS.includes(pathname)) return true
  if (/^\/app\/scan(\/.*)?$/.test(pathname)) return true
  return false
}

// Participants can only access their dashboard
const PARTICIPANT_ALLOWED_PATHS = ['/app']

function isParticipantAllowed(pathname: string): boolean {
  return PARTICIPANT_ALLOWED_PATHS.includes(pathname)
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const hydrated = useAuthHydrated()
  const accessToken = useAuthStore((s) => s.accessToken)
  const user = useAuthStore((s) => s.user)
  const setAuth = useAuthStore((s) => s.setAuth)
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const router = useRouter()
  const pathname = usePathname()

  // Show nothing while hydrating — prevents flash redirect to /login
  if (!hydrated) return null

  // Clear stale dev-token when MSW mocks are disabled
  const mocksEnabled = process.env.NEXT_PUBLIC_ENABLE_MOCKS === 'true'
  if (accessToken === 'dev-token' && !mocksEnabled) {
    clearAuth()
  }

  const isAuthorized = useMemo(() => {
    if (!accessToken || !user) return false
    if (user.role === 'staff') return isStaffAllowed(pathname)
    if (user.role === 'viewer') return isViewerAllowed(pathname)
    if (user.role === 'participant') return isParticipantAllowed(pathname)
    return true
  }, [accessToken, user, pathname])

  useEffect(() => {
    if (!accessToken) {
      router.replace('/login')
      return
    }

    if (user?.role === 'viewer' && !isViewerAllowed(pathname)) {
      router.replace('/app/events')
      return
    }

    if (user?.role === 'participant' && !isParticipantAllowed(pathname)) {
      router.replace('/app')
      return
    }

    if (user?.role === 'staff' && !isStaffAllowed(pathname)) {
      router.replace('/app/scan')
      return
    }
}, [accessToken, user, router, pathname, isAuthorized])

  if (!accessToken || !user) return null


  if (!isAuthorized) return null

  if (user.role === 'participant') {
    return <ParticipantShell>{children}</ParticipantShell>
  }

  return (
    <>
      <AdminShell>{children}</AdminShell>
      <PWAInstallBanner mode="global" />
    </>
  )
}
