'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
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
  const [hydrated, setHydrated] = useState(false)
  const accessToken = useAuthStore((s) => s.accessToken)
  const user = useAuthStore((s) => s.user)
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const router = useRouter()
  const pathname = usePathname()

  // Wait for zustand to finish hydrating from localStorage
  useEffect(() => {
    // Subscribe to hydration event for reactivity
    const unsub = useAuthStore.persist.onFinishHydration?.(() => setHydrated(true))
    // Check if already hydrated (sync)
    if (useAuthStore.persist.hasHydrated?.()) {
      setHydrated(true)
    }
    return unsub
  }, [])

  const mocksEnabled = process.env.NEXT_PUBLIC_ENABLE_MOCKS === 'true'

  // Clear stale dev-token when MSW mocks are disabled
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
    if (!hydrated) return // wait for store to rehydrate from localStorage

    if (!accessToken) {
      // Save the intended destination for redirect-after-login
      sessionStorage.setItem('loginRedirectUrl', pathname)
      router.replace('/login')
      return
    }

    // Don't redirect for role-based restrictions — just render null instead
    // This preserves the URL so the user stays on their intended page
    if (user?.role === 'viewer' && !isViewerAllowed(pathname)) {
      return
    }

    if (user?.role === 'participant' && !isParticipantAllowed(pathname)) {
      return
    }

    if (user?.role === 'staff' && !isStaffAllowed(pathname)) {
      return
    }
  }, [hydrated, accessToken, user, router, pathname, isAuthorized])

  // Show nothing while hydrating — prevents flash redirect to /login
  if (!hydrated) return null

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
