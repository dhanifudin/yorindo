'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'

export default function RootPage() {
  const accessToken = useAuthStore((s) => s.accessToken)
  const user = useAuthStore((s) => s.user)
  const router = useRouter()

  useEffect(() => {
    if (!accessToken) {
      router.replace('/login')
      return
    }
    if (user?.role === 'staff') {
      router.replace('/scan')
    } else {
      router.replace('/admin')
    }
  }, [accessToken, user, router])

  return null
}
