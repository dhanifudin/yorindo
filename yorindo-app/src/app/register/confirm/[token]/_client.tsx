'use client'

import { use, useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/authStore'

interface ConfirmPageProps {
  params: Promise<{ token: string }>
}

interface ConfirmResult {
  message: string
  registration: {
    id: string
    status: string
    eventName: string
    eventSlug: string
    eventDate?: string
    participantName: string
    contactId: string
    participantEmail: string
  }
}

export default function ConfirmPage({ params }: ConfirmPageProps) {
  const { token } = use(params)
  const { setAuth } = useAuthStore()
  const router = useRouter()
  const [participantAuthDone, setParticipantAuthDone] = useState(false)
  const authAttemptedRef = useRef(false)

  const { data, isLoading, isError, error } = useQuery<ConfirmResult>({
    queryKey: ['confirm-registration', token],
    queryFn: async () => {
      const res = await fetch(`/api/registrations/confirm/${token}`)
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body?.error?.message ?? 'Verifikasi gagal')
      }
      return res.json()
    },
    retry: false,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  })

  useEffect(() => {
    if (!data?.registration || participantAuthDone || authAttemptedRef.current) return
    authAttemptedRef.current = true
    const createAccount = async () => {
      try {
        const res = await fetch('/api/auth/google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contactId: data.registration.contactId,
            participantEmail: data.registration.participantEmail,
            participantName: data.registration.participantName,
          }),
        })
        if (!res.ok) return
        const authData = await res.json()
        setAuth(authData.accessToken, authData.user)
        setParticipantAuthDone(true)
      } catch {
        // Silent fail — participant auth is a UX enhancement, not a blocker
      }
    }
    createAccount()
  }, [data, participantAuthDone, setAuth])

  if (isLoading) {
    return (
      <div className="max-w-md mx-auto px-4 py-12 text-center">
        <div className="h-8 w-48 bg-muted rounded animate-pulse mx-auto mb-4" />
        <div className="h-4 w-64 bg-muted rounded animate-pulse mx-auto" />
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <Card>
        <CardContent className="pt-8 pb-8 text-center space-y-4">
          {isError ? (
            <>
              <div className="text-4xl">⚠️</div>
              <h2 className="text-xl font-bold text-destructive">Verifikasi Gagal</h2>
              <p className="text-muted-foreground text-sm">
                {(error as Error).message || 'Token tidak valid atau sudah kadaluarsa.'}
              </p>
              <p className="text-sm text-muted-foreground">
                Silakan hubungi penyelenggara event untuk bantuan.
              </p>
            </>
          ) : (
            <>
              <div className="text-4xl">✅</div>
              <h2 className="text-xl font-bold">Email Dikonfirmasi!</h2>
              <p className="text-muted-foreground text-sm">
                Halo <strong>{data?.registration.participantName}</strong>,{' '}
                pendaftaran Anda untuk <strong>{data?.registration.eventName}</strong> telah dikonfirmasi.
              </p>
              <p className="text-sm text-muted-foreground">
                Tim kami akan meninjau pendaftaran Anda dan memberitahu hasilnya melalui email.
              </p>
              {/* Google Calendar link */}
              {data?.registration.eventDate && (() => {
                const startMs = Date.parse(data.registration.eventDate!)
                if (isNaN(startMs)) return null
                const start = new Date(startMs)
                const end = new Date(startMs + 2 * 3600000)
                const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z'
                const dates = `${encodeURIComponent(fmt(start))}/${encodeURIComponent(fmt(end))}`
                const link = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(data.registration.eventName)}&dates=${dates}`
                return (
                  <a
                    href={link}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                  >
                    📅 Tambahkan ke Google Calendar
                  </a>
                )
              })()}
              {/* Dashboard entry */}
              {participantAuthDone && (
                <Button className="w-full" onClick={() => router.push('/app')}>
                  Masuk ke Dashboard →
                </Button>
              )}
              {/* Social share */}
              {data?.registration.eventSlug && (
                <div className="pt-2 space-y-2">
                  <p className="text-xs text-muted-foreground font-medium">Bagikan ke teman:</p>
                  <div className="flex justify-center gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-green-700 border-green-200 hover:bg-green-50"
                      onClick={() => {
                        const url = `${window.location.origin}/register/${data.registration.eventSlug}`
                        const text = `Saya baru mendaftar ke ${data.registration.eventName}! Daftar juga di: ${url}`
                        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
                      }}
                    >
                      WhatsApp
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const url = `${window.location.origin}/register/${data.registration.eventSlug}`
                        navigator.clipboard.writeText(url)
                        toast.success('Link disalin!')
                      }}
                    >
                      Salin Link
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
