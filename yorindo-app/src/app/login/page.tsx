'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import { useAuthStore } from '@/store/authStore'
import { LoginForm } from '@/components/forms/LoginForm'
import { MockGoogleAuthDialog } from '@/components/auth/MockGoogleAuthDialog'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { EXPERIMENTAL_ENABLED } from '@/lib/featureFlags'

export default function LoginPage() {
  const accessToken = useAuthStore((s) => s.accessToken)
  const setAccessToken = useAuthStore((s) => s.setAccessToken)
  const router = useRouter()
  const [showSsoDialog, setShowSsoDialog] = useState(false)

  useEffect(() => {
    if (accessToken) router.replace('/app')
  }, [accessToken, router])

  if (accessToken) return <div />

  const handleParticipantLogin = async (name: string, email: string) => {
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantEmail: email, participantName: name }),
      })
      if (!res.ok) throw new Error('Login gagal')
      const data = await res.json()
      setAccessToken(data.accessToken, data.user)
    } catch (err) {
      console.error(err)
      toast.error('Login gagal')
   }
  }

  return (
    <>
      {EXPERIMENTAL_ENABLED && (
        <MockGoogleAuthDialog
          open={showSsoDialog}
          onOpenChange={setShowSsoDialog}
          onSuccess={handleParticipantLogin}
        />
      )}
      <div className="w-full max-w-[420px] bg-card rounded-2xl shadow-sm p-8 md:p-10">
        {/* Admin Portal badge */}
        <div className="mb-6 flex justify-center">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-secondary border border-primary/20 px-3 py-1 text-xs font-semibold text-secondary-foreground">
            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
            Admin Portal
          </div>
        </div>

        <div className="mb-8 text-center">
          <div className="text-3xl font-bold text-primary mb-1">Yorindo</div>
          <p className="text-sm text-muted-foreground">Masuk ke akun admin Anda</p>
        </div>
        <LoginForm />
        {EXPERIMENTAL_ENABLED && (
          <div className="mt-4 text-center">
            <Button
              variant="link"
              size="sm"
              className="text-muted-foreground hover:text-primary"
              onClick={() => setShowSsoDialog(true)}
            >
              Masuk sebagai Peserta (Google)
            </Button>
          </div>
        )}

        {/* Footer note */}
        <div className="mt-6 flex items-center justify-center gap-1.5 text-xs text-muted-foreground/60">
          <div className="w-1 h-1 rounded-full bg-muted-foreground/40" />
          Restricted to authorized personnel only
          <div className="w-1 h-1 rounded-full bg-muted-foreground/40" />
        </div>
      </div>
    </>
  )
}
