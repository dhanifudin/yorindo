'use client'

import { useEffect, useRef } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { toast } from 'sonner'
import { useAuthStore } from '@/store/authStore'

type ScanResultState =
  | { type: 'success'; contactName: string; eventName: string }
  | { type: 'already_attended'; attendedAt: string | null }
  | { type: 'wrong_event' }
  | { type: 'invalid' }

interface QRScannerProps {
  eventId: string
}

const AUTO_RESET_MS = 3000

export function QRScanner({ eventId }: QRScannerProps) {
  const accessToken = useAuthStore((s) => s.accessToken)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const isScanningRef = useRef(true)
  const isStartedRef = useRef(false)

  useEffect(() => {
    const elementId = 'qr-reader'
    const html5QrCode = new Html5Qrcode(elementId)
    scannerRef.current = html5QrCode
    isScanningRef.current = true
    isStartedRef.current = false

    html5QrCode
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          if (!isScanningRef.current) return
          isScanningRef.current = false
          try {
            await html5QrCode.pause(true)
          } catch {
            // pause may fail if already stopped — safe to ignore
          }
          const result = await verifyScan(decodedText, accessToken)

          if (result.type === 'success') {
            toast.success('Check-in Berhasil', { description: result.contactName })
          } else if (result.type === 'already_attended') {
            const formatted = result.attendedAt
              ? new Intl.DateTimeFormat('id-ID', {
                  hour: '2-digit',
                  minute: '2-digit',
                  day: 'numeric',
                  month: 'short',
                }).format(new Date(result.attendedAt))
              : 'Waktu tidak diketahui'
            toast.warning('Sudah Check-in', { description: `Waktu: ${formatted}` })
          } else if (result.type === 'wrong_event') {
            toast.error('Tiket Salah Event', { description: 'Tiket bukan untuk event ini' })
          } else {
            toast.error('Tiket Tidak Valid', { description: 'Tiket tidak valid atau kedaluwarsa' })
          }

          // Auto-resume after AUTO_RESET_MS so next scan is accepted
          setTimeout(async () => {
            isScanningRef.current = true
            try {
              await html5QrCode.resume()
            } catch {
              // resume may fail if stopped — safe to ignore
            }
          }, AUTO_RESET_MS)
        },
        () => {
          // scan failure on each frame — intentionally ignored
        }
      )
      .then(() => {
        isStartedRef.current = true
      })
      .catch(() => {
        // Camera access denied or not available
        toast.error('Tiket Tidak Valid', { description: 'Kamera tidak tersedia atau akses ditolak' })
      })

    return () => {
      if (isStartedRef.current) {
        html5QrCode.stop().catch(() => {})
      }
      scannerRef.current = null
    }
  }, [eventId]) // restart scanner when event changes

  return (
    <div className="w-full h-full flex flex-col">
      <div
        id="qr-reader"
        className="w-full flex-1 bg-black"
      />
      <p className="mt-2 mx-4 text-xs text-muted-foreground text-center pb-2">
        Token uji: <code className="bg-muted px-1 rounded">MOCK_INVALID</code>,{' '}
        <code className="bg-muted px-1 rounded">MOCK_ALREADY</code>,{' '}
        <code className="bg-muted px-1 rounded">MOCK_WRONG_EVENT</code>
      </p>
    </div>
  )
}

async function verifyScan(token: string, accessToken: string | null): Promise<ScanResultState> {
  try {
    const res = await fetch('/api/scan/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify({ token }),
    })

    if (res.status === 401) return { type: 'invalid' }

    const data = await res.json()

    if (!res.ok) {
      if (data?.error?.code === 'WRONG_EVENT') return { type: 'wrong_event' }
      return { type: 'invalid' }
    }

    if (data.status === 'already_attended') {
      return { type: 'already_attended', attendedAt: data.attendedAt ?? null }
    }

    return {
      type: 'success',
      contactName: data.registration?.contactName ?? 'Peserta',
      eventName: data.registration?.eventName ?? '',
    }
  } catch {
    return { type: 'invalid' }
  }
}
