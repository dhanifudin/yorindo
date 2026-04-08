'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { AdminDashboard } from '@/components/features/dashboard/AdminDashboard'
import { ViewerDashboard } from '@/components/features/dashboard/ViewerDashboard'
import { StaffDashboard } from '@/components/features/dashboard/StaffDashboard'
import { ParticipantDashboard } from '@/components/features/dashboard/ParticipantDashboard'

export default function DashboardPage() {
  const accessToken = useAuthStore((s) => s.accessToken)
  const user = useAuthStore((s) => s.user)
  const router = useRouter()

  useEffect(() => {
    if (!accessToken) {
      router.replace('/login')
      return
    }
    const roles = ['admin', 'viewer', 'staff', 'participant']
    if (user && !roles.includes(user.role)) {
      router.replace('/login')
    }
  }, [accessToken, user, router])

  if (!accessToken || !user) return null

  if (user.role === 'admin') return <AdminDashboard />
  if (user.role === 'viewer') return <ViewerDashboard />
  if (user.role === 'staff') return <StaffDashboard />
  if (user.role === 'participant') return <ParticipantDashboard />

  return null
}
