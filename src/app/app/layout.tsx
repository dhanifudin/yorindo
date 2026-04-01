'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { AdminShell } from '@/components/layout/AdminShell'
import { ParticipantShell } from '@/components/layout/ParticipantShell'
import { PWAInstallBanner } from '@/components/features/scan/PWAInstallBanner'
import type { User } from '@/types/api'

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

const STAFF_BLOCKED_PREFIXES = ['/app/admin']

function isStaffBlocked(pathname: string): boolean {
  return STAFF_BLOCKED_PREFIXES.some((p) => pathname.startsWith(p))
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const accessToken = useAuthStore((s) => s.accessToken)
  const user = useAuthStore((s) => s.user)
  const setAuth = useAuthStore((s) => s.setAuth)
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const router = useRouter()
  const pathname = usePathname()
  const accessTokenRef = useRef(accessToken)
  const userRef = useRef(user)

  const isAuthorized = useMemo(() => {
    if (!accessToken || !user) return false
    if (user.role === 'staff') return isStaffAllowed(pathname)
    if (user.role === 'viewer') return isViewerAllowed(pathname)
    if (user.role === 'participant') return isParticipantAllowed(pathname)
    return true
  }, [accessToken, user, pathname])

  useEffect(() => {
    accessTokenRef.current = accessToken
    userRef.current = user
  }, [accessToken, user])

  useEffect(() => {
    const originalFetch = window.fetch.bind(window)
    let refreshPromise: Promise<string | null> | null = null

    function shouldHandle(url: string, headers: Headers) {
      const isApi = url.startsWith('/api/')
      const isRefresh = url === '/api/auth/refresh'
      const isLogin = url === '/api/auth/login'
      const isLogout = url === '/api/auth/logout'
      const alreadyRetried = headers.get('x-auth-retry') === '1'
      const hasBearer = headers.has('Authorization') || !!accessTokenRef.current
      return isApi && hasBearer && !isRefresh && !isLogin && !isLogout && !alreadyRetried
    }

    async function refreshAccessToken() {
      if (!refreshPromise) {
        refreshPromise = originalFetch('/api/auth/refresh', {
          method: 'POST',
          credentials: 'include',
        })
          .then(async (response) => {
            if (!response.ok) return null
            const data = await response.json() as { accessToken?: string }
            return data.accessToken ?? null
          })
          .finally(() => {
            refreshPromise = null
          })
      }

      return refreshPromise
    }

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
      const request = new Request(
        typeof input === 'string' && input.startsWith('/') ? new URL(input, window.location.origin) : input,
        init,
      )
      const headers = new Headers(request.headers)

      if (url.startsWith('/api/') && accessTokenRef.current && !headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${accessTokenRef.current}`)
        if (accessTokenRef.current === 'dev-token' && userRef.current?.id) {
          headers.set('X-User-Id', userRef.current.id)
        }
      }

      const performFetch = (overrideHeaders: Headers) =>
        originalFetch(input, {
          ...init,
          headers: overrideHeaders,
          credentials: init?.credentials ?? 'same-origin',
        })

      const response = await performFetch(headers)
      if (response.status !== 401 || !shouldHandle(url, headers)) {
        return response
      }

      const refreshedToken = await refreshAccessToken()
      if (!refreshedToken) {
        clearAuth()
        router.replace('/login')
        return response
      }

      const currentUser = userRef.current as (Pick<User, 'id' | 'role'> & { name?: string; email?: string }) | null
      if (currentUser) {
        setAuth(refreshedToken, currentUser)
      }

      const retryHeaders = new Headers(headers)
      retryHeaders.set('Authorization', `Bearer ${refreshedToken}`)
      retryHeaders.set('x-auth-retry', '1')
      if (refreshedToken === 'dev-token' && currentUser?.id) {
        retryHeaders.set('X-User-Id', currentUser.id)
      }

      const retryResponse = await performFetch(retryHeaders)
      if (retryResponse.status === 401) {
        clearAuth()
        router.replace('/login')
      }
      return retryResponse
    }

    return () => {
      window.fetch = originalFetch
    }
  }, [clearAuth, router, setAuth])

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

  // ✅ Only change: block rendering if user is not authorized for this route
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
