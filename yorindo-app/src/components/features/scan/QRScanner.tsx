'use client'

import { useEffect, useLayoutEffect, useRef } from 'react'
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

// Patch HTMLVideoElement.prototype.play once to silently catch AbortError.
// html5-qrcode calls video.play() without catching the returned promise.
// When the video element is removed (navigation, React Strict Mode, etc.),
// the browser rejects play() with AbortError — a benign, expected condition
// per Chrome docs: https://developer.chrome.com/blog/play-request-was-interrupted
if (typeof window !== 'undefined' && !(_patchApplied())) {
  const origPlay = HTMLVideoElement.prototype.play
  HTMLVideoElement.prototype.play = function (this: HTMLVideoElement) {
    return origPlay.call(this).catch((err: unknown) => {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return // expected — play interrupted by removal or source change
      }
      throw err
    })
  }
}

function _patchApplied(): boolean {
  // Guard against double-patching from HMR
  const key = '__qrPlayPatched' as keyof typeof globalThis
  if ((globalThis as Record<string, unknown>)[key]) return true
  ;(globalThis as Record<string, unknown>)[key] = true
  return false
}

export function QRScanner({ eventId }: QRScannerProps) {
  const accessToken = useAuthStore((s) => s.accessToken)
  const accessTokenRef = useRef(accessToken)
  useLayoutEffect(() => { accessTokenRef.current = accessToken })

  useEffect(() => {
    const elementId = 'qr-reader'
    const html5QrCode = new Html5Qrcode(elementId)
    let isMounted = true
    let isScanReady = true

    const startPromise = html5QrCode
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          if (!isMounted || !isScanReady) return
          isScanReady = false
          try {
            await html5QrCode.pause(true)
          } catch {
            // pause may fail if already stopped — safe to ignore
          }
          const result = await verifyScan(decodedText, accessTokenRef.current)

          if (!isMounted) return

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
            if (!isMounted) return
            isScanReady = true
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
      .then(() => true, () => false) // normalize: true = started, false = failed

    // Show error toast only if start failed while still mounted
    startPromise.then((started) => {
      if (!started && isMounted) {
        toast.error('Kamera Tidak Tersedia', { description: 'Kamera tidak tersedia atau akses ditolak' })
      }
    })

    return () => {
      isMounted = false
      // Chain cleanup after start resolves/rejects to avoid racing
      startPromise
        .then((started) => {
          if (started) return html5QrCode.stop()
        })
        .catch(() => {})
        .finally(() => releaseCamera(elementId))
    }
  }, [eventId]) // restart scanner when event changes

  return (
    <div className="w-full h-full flex flex-col">
      <div
        id="qr-reader"
        className="w-full flex-1 bg-black"
      />
    </div>
  )
}

function releaseCamera(elementId: string) {
  try {
    const videoEl = document.querySelector(`#${elementId} video`) as HTMLVideoElement | null
    if (videoEl?.srcObject) {
      const stream = videoEl.srcObject as MediaStream
      stream.getTracks().forEach((track) => track.stop())
      videoEl.srcObject = null
    }
  } catch {
    // DOM query may fail during teardown — safe to ignore
  }
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
