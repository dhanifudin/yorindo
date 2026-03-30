'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISS_KEY = 'pwa-install-dismissed'
const DISMISS_TTL_DAYS = 30
const GLOBAL_DELAY_MS = 3000

// Module-level singleton: capture the beforeinstallprompt event once,
// shared across all PWAInstallBanner instances to avoid competing handlers.
let capturedPromptEvent: BeforeInstallPromptEvent | null = null
const promptListeners = new Set<() => void>()

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    capturedPromptEvent = e as BeforeInstallPromptEvent
    promptListeners.forEach((fn) => fn())
  })
}

function isDismissed(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY)
    if (!raw) return false
    const ts = parseInt(raw, 10)
    if (isNaN(ts)) return true // legacy string "true" — treat as dismissed
    return Date.now() - ts < DISMISS_TTL_DAYS * 86_400_000
  } catch {
    return false
  }
}

function setDismissed(): void {
  try { localStorage.setItem(DISMISS_KEY, String(Date.now())) } catch { /* storage unavailable */ }
}

interface PWAInstallBannerProps {
  mode?: 'global' | 'scan'
}

export function PWAInstallBanner({ mode = 'global' }: PWAInstallBannerProps) {
  const [showBanner, setShowBanner] = useState(false)
  const isMountedRef = useRef(true)
  const pathname = usePathname()

  useEffect(() => {
    isMountedRef.current = true
    return () => { isMountedRef.current = false }
  }, [])

  useEffect(() => {
    let delayTimer: ReturnType<typeof setTimeout> | null = null

    const notify = () => {
      if (!isMountedRef.current) return
      if (mode === 'scan') {
        setShowBanner(true)
      } else {
        delayTimer = setTimeout(() => {
          if (isMountedRef.current) setShowBanner(true)
        }, GLOBAL_DELAY_MS)
      }
    }

    // If prompt was already captured before mount, trigger immediately
    if (capturedPromptEvent) {
      notify()
    }

    // Listen for future prompt events
    promptListeners.add(notify)
    return () => {
      promptListeners.delete(notify)
      if (delayTimer) clearTimeout(delayTimer)
    }
  }, [mode]) // no pathname — checks are at render time

  const handleInstall = useCallback(async () => {
    if (!capturedPromptEvent) return
    await capturedPromptEvent.prompt()
    await capturedPromptEvent.userChoice
    capturedPromptEvent = null
    if (isMountedRef.current) setShowBanner(false)
  }, [])

  const handleDismiss = useCallback(() => {
    if (mode === 'global') setDismissed()
    setShowBanner(false)
  }, [mode])

  // Render-time guards (F1: no pathname in deps, F3: no competing handlers, F7: dismiss check at render)
  if (!showBanner) return null
  if (mode === 'global' && pathname.startsWith('/app/scan')) return null
  if (mode === 'global' && isDismissed()) return null

  const title = mode === 'scan' ? 'Install Yorindo Check-in' : 'Install Yorindo'
  const subtitle = mode === 'scan' ? 'Akses cepat & mode offline' : 'Install sebagai aplikasi'

  return (
    <Card className="fixed bottom-20 left-4 right-4 z-50 max-w-sm mx-auto shadow-lg md:bottom-4">
      <CardContent className="flex items-center gap-3 pt-4 pb-4">
        <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg flex-shrink-0">
          Y
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">{title}</p>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <div className="flex flex-col gap-1">
          <Button size="sm" className="text-xs" onClick={handleInstall}>
            Install
          </Button>
          <Button size="sm" variant="ghost" className="text-xs" onClick={handleDismiss}>
            Nanti
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
