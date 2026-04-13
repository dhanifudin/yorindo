'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

import { useAuthStore, useAuthHydrated } from '@/store/authStore'
import { LoginForm } from '@/components/forms/LoginForm'
// SSO deferred — participant login hidden for now
// import { MockGoogleAuthDialog } from '@/components/auth/MockGoogleAuthDialog'
// import { Button } from '@/components/ui/button'

export default function LoginPage() {
  const hydrated = useAuthHydrated()
  const accessToken = useAuthStore((s) => s.accessToken)
  const router = useRouter()

  useEffect(() => {
    if (hydrated && accessToken) {
      const redirectUrl = sessionStorage.getItem('loginRedirectUrl')
      sessionStorage.removeItem('loginRedirectUrl')
      router.replace(redirectUrl || '/app')
    }
  }, [hydrated, accessToken, router])

  if (!hydrated || accessToken) return null

  // SSO deferred — handleParticipantLogin hidden for now
  /*
  const setAuth = useAuthStore((s) => s.setAuth)
  const handleParticipantLogin = async (name: string, email: string) => { ... }
  */

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#fafafa] px-4 py-8">
      {/* SSO deferred — MockGoogleAuthDialog hidden */}
      {/* <MockGoogleAuthDialog open={showSsoDialog} onOpenChange={setShowSsoDialog} onSuccess={handleParticipantLogin} /> */}

      {/* Compact login card */}
      <div className="w-full max-w-[440px] bg-white p-8 md:p-12 rounded-2xl shadow-sm border border-slate-100">

        {/* Branding Section */}
        <div className="flex flex-col items-center mb-10">
          <div className="mb-6 px-4 py-1.5 rounded-full bg-slate-50 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
            Secure Access
          </div>

          {/* Logo */}
          <div className="mb-4 h-20 flex items-center justify-center w-full">
            <Image
              src="/icons/emyu.jpg"
              alt="EM · U Logo"
              width={280}
              height={80}
              priority
              className="object-contain"
              quality={100}
            />
          </div>

          <p className="text-slate-500 text-sm font-medium tracking-tight">
            Admin Portal
          </p>
        </div>

        {/* Main Form */}
        <div className="space-y-8">
          <LoginForm />
        </div>
      </div>
    </div>
  )
}