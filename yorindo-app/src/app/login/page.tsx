'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { LoginForm } from '@/components/forms/LoginForm'
import { MockGoogleAuthDialog } from '@/components/auth/MockGoogleAuthDialog'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

const ssoEnabled = process.env.NEXT_PUBLIC_ENABLE_EXPERIMENTAL === 'true'

export default function LoginPage() {
  const accessToken = useAuthStore((s) => s.accessToken)
  const setAccessToken = useAuthStore((s) => s.setAccessToken)
  const router = useRouter()
  const [showSsoDialog, setShowSsoDialog] = useState(false)

  useEffect(() => {
    if (accessToken) router.replace('/app')
  }, [accessToken, router])

  if (accessToken) return null

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
      // The useEffect above will redirect to /app once accessToken is set
    } catch {
      toast.error('Login peserta gagal. Silakan coba lagi.')
    }
  }

  return (
    <>
      {ssoEnabled && (
        <MockGoogleAuthDialog
          open={showSsoDialog}
          onOpenChange={setShowSsoDialog}
          onSuccess={handleParticipantLogin}
        />
      )}
      <div className="w-full max-w-sm bg-card border border-border rounded-xl shadow-sm p-8">
        <div className="mb-8 text-center">
          <div className="text-3xl font-bold text-primary mb-1">Yorindo</div>
          <p className="text-sm text-muted-foreground">Admin Portal</p>
        </div>
        <LoginForm />
        {ssoEnabled && (
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
      </div>
    </>
  )
}
