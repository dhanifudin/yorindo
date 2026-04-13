'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { AdminShell } from '@/components/layout/AdminShell'
import { ParticipantShell } from '@/components/layout/ParticipantShell'
import { PWAInstallBanner } from '@/components/features/scan/PWAInstallBanner'

// Routes that viewers (read-only) are allowed to access
const VIEWER_ALLOWED_PATHS = ['/app', '/app/events']
const STAFF_ALLOWED_PATHS = ['/app']

// Scan is staff-only — admins are explicitly blocked
const ADMIN_BLOCKED_PATHS = ['/app/scan']

function isAdminBlocked(pathname: string): boolean {
  return ADMIN_BLOCKED_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

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
  const [mounted, setMounted] = useState(false)
  const accessToken = useAuthStore((s) => s.accessToken)
  const user = useAuthStore((s) => s.user)
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const router = useRouter()
  const pathname = usePathname()

  // Prevent SSR/client hydration mismatch — render null until mounted
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setMounted(true) }, [])

  const mocksEnabled = process.env.NEXT_PUBLIC_ENABLE_MOCKS === 'true'

  // Clear stale dev-token when MSW mocks are disabled
  if (accessToken === 'dev-token' && !mocksEnabled) {
    clearAuth()
  }

  const isAuthorized = useMemo(() => {
    if (!accessToken || !user) return false
    if (user.role === 'admin') return !isAdminBlocked(pathname)
    if (user.role === 'staff') return isStaffAllowed(pathname)
    if (user.role === 'viewer') return isViewerAllowed(pathname)
    if (user.role === 'participant') return isParticipantAllowed(pathname)
    return true
  }, [accessToken, user, pathname])

  useEffect(() => {
    if (!mounted) return

    // Check Zustand hydration — skip redirect if hydration hasn't completed.
    // When hydration finishes, Zustand updates the store, this component re-renders,
    // and the effect fires again with the correct auth state.
    const zustandPersist = (useAuthStore as unknown as { persist?: { hasHydrated: () => boolean } }).persist
    if (!zustandPersist?.hasHydrated?.()) return

    if (!accessToken || !user) {
      sessionStorage.setItem('loginRedirectUrl', pathname)
      router.replace('/login')
      return
    }

    if (user.role === 'viewer' && !isViewerAllowed(pathname)) {
      router.replace('/app/events')
      return
    }

    if (user.role === 'participant' && !isParticipantAllowed(pathname)) {
      router.replace('/app')
      return
    }

    if (user.role === 'staff' && !isStaffAllowed(pathname)) {
      router.replace('/app')
      return
    }

    if (user.role === 'admin' && isAdminBlocked(pathname)) {
      router.replace('/app')
      return
    }
  }, [mounted, accessToken, user, router, pathname, isAuthorized])

  if (!mounted) return null
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
