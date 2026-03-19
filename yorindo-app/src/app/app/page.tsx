'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { AdminDashboard } from '@/components/features/dashboard/AdminDashboard'
import { ViewerDashboard } from '@/components/features/dashboard/ViewerDashboard'
import { StaffDashboard } from '@/components/features/dashboard/StaffDashboard'

export default function DashboardPage() {
  const accessToken = useAuthStore((s) => s.accessToken)
  const user = useAuthStore((s) => s.user)
  const router = useRouter()

  useEffect(() => {
    if (!accessToken) router.replace('/login')
  }, [accessToken, router])

  if (!accessToken || !user) return null

  if (user.role === 'admin') return <AdminDashboard />
  if (user.role === 'viewer') return <ViewerDashboard />
  if (user.role === 'staff') return <StaffDashboard />

  router.replace('/login')
  return null
}
