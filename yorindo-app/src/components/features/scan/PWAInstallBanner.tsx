'use client'

import { useEffect, useRef, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function PWAInstallBanner() {
  const [showBanner, setShowBanner] = useState(false)
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (sessionStorage.getItem('installBannerDismissed')) return

    const handler = (e: Event) => {
      e.preventDefault()
      deferredPrompt.current = e as BeforeInstallPromptEvent
      setShowBanner(true)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt.current) return
    await deferredPrompt.current.prompt()
    await deferredPrompt.current.userChoice
    deferredPrompt.current = null
    setShowBanner(false)
  }

  const handleDismiss = () => {
    sessionStorage.setItem('installBannerDismissed', 'true')
    setShowBanner(false)
  }

  if (!showBanner) return null

  return (
    <Card className="fixed bottom-20 left-4 right-4 z-50 max-w-sm mx-auto shadow-lg md:bottom-4">
      <CardContent className="flex items-center gap-3 pt-4 pb-4">
        <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg flex-shrink-0">
          Y
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">Install Yorindo Check-in</p>
          <p className="text-xs text-muted-foreground">Akses cepat & mode offline</p>
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
