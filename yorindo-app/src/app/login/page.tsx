'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { LoginForm } from '@/components/forms/LoginForm'

export default function LoginPage() {
  const accessToken = useAuthStore(s => s.accessToken)
  const router = useRouter()

  useEffect(() => {
    if (accessToken) router.replace('/admin')
  }, [accessToken, router])

  if (accessToken) return null

  return (
    <div className="w-full max-w-sm bg-white rounded-lg shadow-md p-8">
      <div className="mb-8 text-center">
        <div className="text-3xl font-bold text-blue-600 mb-1">Yorindo</div>
        <p className="text-sm text-gray-500">Admin Portal</p>
      </div>
      <LoginForm />
    </div>
  )
}
