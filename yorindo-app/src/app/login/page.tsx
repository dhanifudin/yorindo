'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Eye, EyeOff } from 'lucide-react'

import { useAuthStore, useAuthHydrated } from '@/store/authStore'
import { LoginForm } from '@/components/forms/LoginForm'
import { MockGoogleAuthDialog } from '@/components/auth/MockGoogleAuthDialog'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export default function LoginPage() {
  const hydrated = useAuthHydrated()
  const accessToken = useAuthStore((s) => s.accessToken)
  const setAuth = useAuthStore((s) => s.setAuth)
  const router = useRouter()
  const [showSsoDialog, setShowSsoDialog] = useState(false)

  useEffect(() => {
    if (hydrated && accessToken) {
      const redirectUrl = sessionStorage.getItem('loginRedirectUrl')
      sessionStorage.removeItem('loginRedirectUrl')
      router.replace(redirectUrl || '/app')
    }
  }, [hydrated, accessToken, router])

  if (!hydrated || accessToken) return null

  const handleParticipantLogin = async (name: string, email: string) => {
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantEmail: email, participantName: name }),
      })
      if (!res.ok) throw new Error('Login gagal')
      const data = await res.json()
      setAuth(data.accessToken, data.user, data.eventKeys ?? {})
    } catch (err) {
      console.error(err)
      toast.error('Login peserta gagal. Silakan coba lagi.')
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#fafafa] px-4 py-8">
      <MockGoogleAuthDialog
        open={showSsoDialog}
        onOpenChange={setShowSsoDialog}
        onSuccess={handleParticipantLogin}
      />

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
        <div className="space-y-8">   {/* Increased overall spacing */}
          <LoginForm />

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-100" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-4 text-slate-300 font-bold tracking-[0.15em]">Atau</span>
            </div>
          </div>

          {/* Google Login Button */}
          <Button
            variant="ghost"
            className="w-full h-12 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-all duration-200 font-semibold text-sm shadow-sm"
            onClick={() => setShowSsoDialog(true)}
          >
            <svg className="mr-2.5 h-5 w-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Masuk sebagai Peserta
          </Button>
        </div>
      </div>
    </div>
  )
}