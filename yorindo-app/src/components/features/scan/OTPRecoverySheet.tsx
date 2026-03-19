'use client'

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

interface OTPRecoverySheetProps {
  open: boolean
  onClose: () => void
  eventId: string
  onSuccess: (result: { contactName: string; eventName: string }) => void
}

export function OTPRecoverySheet({ open, onClose, eventId, onSuccess }: OTPRecoverySheetProps) {
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)

  const requestMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/scan/otp/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, eventId }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data?.error?.message ?? 'Gagal mengirim OTP')
      }
      return res.json()
    },
    onSuccess: () => {
      setOtpSent(true)
      toast.success('OTP dikirim ke ' + phone)
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Gagal mengirim OTP'),
  })

  const verifyMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/scan/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp, eventId }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data?.error?.message ?? 'OTP tidak valid')
      }
      return res.json()
    },
    onSuccess: (data) => {
      onSuccess(data.registration)
      toast.success(`Check-in berhasil: ${data.registration.contactName}`)
      onClose()
      setPhone('')
      setOtp('')
      setOtpSent(false)
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'OTP tidak valid'),
  })

  const handleClose = () => {
    onClose()
    setPhone('')
    setOtp('')
    setOtpSent(false)
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && handleClose()}>
      <SheetContent side="bottom" className="pb-8">
        <SheetHeader>
          <SheetTitle>Pemulihan via OTP</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-4">
          {!otpSent ? (
            <>
              <p className="text-sm text-muted-foreground">
                Masukkan nomor telepon peserta untuk mengirim OTP.
              </p>
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+628..."
                className="h-12 text-base"
              />
              <Button
                className="w-full h-12"
                onClick={() => requestMutation.mutate()}
                disabled={!phone || requestMutation.isPending}
              >
                {requestMutation.isPending ? 'Mengirim…' : 'Kirim OTP'}
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                OTP dikirim ke <strong>{phone}</strong>. Minta peserta untuk memberikan kode OTP.
              </p>
              <Input
                type="text"
                inputMode="numeric"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="Masukkan OTP 6 digit"
                className="h-12 text-base text-center tracking-widest"
                maxLength={6}
              />
              <Button
                className="w-full h-12"
                onClick={() => verifyMutation.mutate()}
                disabled={otp.length < 4 || verifyMutation.isPending}
              >
                {verifyMutation.isPending ? 'Verifikasi…' : 'Verifikasi OTP'}
              </Button>
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => { setOtpSent(false); setOtp('') }}
              >
                Kirim ulang OTP
              </Button>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
