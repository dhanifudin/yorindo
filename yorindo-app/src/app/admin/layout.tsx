'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { AdminShell } from '@/components/layout/AdminShell'

// Routes that viewers (read-only) are allowed to access
const VIEWER_ALLOWED_PATHS = ['/admin', '/admin/events']

function isViewerAllowed(pathname: string): boolean {
  if (VIEWER_ALLOWED_PATHS.includes(pathname)) return true
  if (/^\/admin\/events\/[^/]+\/report/.test(pathname)) return true
  if (/^\/admin\/events\/[^/]+$/.test(pathname)) return true
  return false
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const accessToken = useAuthStore((s) => s.accessToken)
  const user = useAuthStore((s) => s.user)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!accessToken) {
      router.replace('/login')
      return
    }
    if (user?.role === 'staff') {
      router.replace('/scan')
      return
    }
    if (user?.role === 'viewer' && !isViewerAllowed(pathname)) {
      router.replace('/admin/events')
    }
  }, [accessToken, user, router, pathname])

  if (!accessToken) return null
  if (user?.role === 'staff') return null

  return <AdminShell>{children}</AdminShell>
}
