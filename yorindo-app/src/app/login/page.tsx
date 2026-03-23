'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { LoginForm } from '@/components/forms/LoginForm'

export default function LoginPage() {
  const accessToken = useAuthStore(s => s.accessToken)
  const router = useRouter()

  useEffect(() => {
    if (accessToken) router.replace('/app')
  }, [accessToken, router])

  if (accessToken) return null

  return (
    <div className="w-full max-w-sm bg-card border border-border rounded-xl shadow-sm p-8">
      <div className="mb-8 text-center">
        <div className="text-3xl font-bold text-primary mb-1">Yorindo</div>
        <p className="text-sm text-muted-foreground">Admin Portal</p>
      </div>
      <LoginForm />
    </div>
  )
}
