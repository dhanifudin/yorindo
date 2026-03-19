'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { useEvents } from '@/hooks/useEvents'
import { PWAInstallBanner } from '@/components/features/scan/PWAInstallBanner'
import { ParticipantSyncStatus } from '@/components/features/scan/ParticipantSyncStatus'
import { QRScanner } from '@/components/features/scan/QRScanner'
import { OTPRecoverySheet } from '@/components/features/scan/OTPRecoverySheet'
import { NameSearchSheet } from '@/components/features/scan/NameSearchSheet'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { QrCode, Clock, ChevronDown, Key, Search, Wifi, WifiOff } from 'lucide-react'
import { toast } from 'sonner'
import { getQueueCount, flushScanQueue } from '@/lib/scanQueue'

export default function ScanPage() {
  const [selectedEventId, setSelectedEventId] = useState('')
  const [showEventSheet, setShowEventSheet] = useState(false)
  const [showOTPSheet, setShowOTPSheet] = useState(false)
  const [showSearchSheet, setShowSearchSheet] = useState(false)
  const [activeTab, setActiveTab] = useState<'scan' | 'otp' | 'search'>('scan')
  const [isOnline, setIsOnline] = useState(true)
  const [queueCount, setQueueCount] = useState(0)
  const { data, isLoading } = useEvents()
  const accessToken = useAuthStore((s) => s.accessToken)
  const user = useAuthStore((s) => s.user)
  const router = useRouter()

  useEffect(() => {
    if (!accessToken) {
      router.replace('/login')
      return
    }
    if (user?.role === 'admin' || user?.role === 'viewer') {
      router.replace('/admin')
    }
  }, [accessToken, user, router])

  // Track online/offline
  useEffect(() => {
    const updateOnline = () => setIsOnline(navigator.onLine)
    setIsOnline(navigator.onLine)
    window.addEventListener('online', updateOnline)
    window.addEventListener('offline', updateOnline)
    return () => {
      window.removeEventListener('online', updateOnline)
      window.removeEventListener('offline', updateOnline)
    }
  }, [])

  // Flush queue on reconnect
  useEffect(() => {
    if (!isOnline) return
    const flush = async () => {
      const count = await getQueueCount()
      if (count === 0) return
      const result = await flushScanQueue()
      setQueueCount(0)
      if (result.conflicts.length > 0) {
        toast.warning(`${result.conflicts.length} konflik terdeteksi setelah sinkronisasi`)
      } else if (result.success > 0) {
        toast.success(`${result.success} scan berhasil disinkronisasi`)
      }
    }
    flush()
  }, [isOnline])

  // Poll queue count
  useEffect(() => {
    const poll = async () => {
      const count = await getQueueCount()
      setQueueCount(count)
    }
    poll()
    const interval = setInterval(poll, 3000)
    return () => clearInterval(interval)
  }, [])

  const handleCheckInSuccess = useCallback((result: { contactName: string; eventName: string }) => {
    toast.success(`✓ ${result.contactName}`)
  }, [])

  if (!accessToken) return null
  if (user?.role === 'admin' || user?.role === 'viewer') return null

  const selectedEvent = data?.data.find((e) => e.id === selectedEventId)

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Sticky header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border sticky top-0 bg-background z-10">
        <button
          onClick={() => setShowEventSheet(true)}
          className="flex items-center gap-2 text-sm font-medium"
        >
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
          {selectedEvent?.name ?? 'Pilih Event'}
        </button>
        <div className="flex items-center gap-2">
          {/* Online/offline indicator */}
          <div className={`flex items-center gap-1 text-xs ${isOnline ? 'text-green-600' : 'text-destructive'}`}>
            {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            {!isOnline && 'Offline'}
          </div>
          {queueCount > 0 && (
            <Badge className="bg-orange-100 text-orange-700 text-xs">
              {queueCount} pending
            </Badge>
          )}
          <span className="text-xs text-muted-foreground">{user?.id}</span>
        </div>
      </header>

      {/* Scanner fills remaining space */}
      <div className="flex-1 relative pb-28">
        {activeTab === 'scan' && (
          selectedEventId ? (
            <QRScanner eventId={selectedEventId} />
          ) : (
            <div className="h-full flex items-center justify-center p-8">
              <Button onClick={() => setShowEventSheet(true)}>
                Pilih Event untuk Mulai
              </Button>
            </div>
          )
        )}
        {activeTab === 'otp' && selectedEventId && (
          <div className="p-6 flex flex-col items-center justify-center h-full">
            <p className="text-muted-foreground mb-4 text-sm">Pemulihan identitas via OTP</p>
            <Button className="h-12 px-8" onClick={() => setShowOTPSheet(true)}>
              Buka OTP Recovery
            </Button>
          </div>
        )}
        {activeTab === 'search' && selectedEventId && (
          <div className="p-6 flex flex-col items-center justify-center h-full">
            <p className="text-muted-foreground mb-4 text-sm">Cari peserta berdasarkan nama</p>
            <Button className="h-12 px-8" onClick={() => setShowSearchSheet(true)}>
              Cari Peserta
            </Button>
          </div>
        )}
        {(activeTab === 'otp' || activeTab === 'search') && !selectedEventId && (
          <div className="h-full flex items-center justify-center p-8">
            <Button onClick={() => setShowEventSheet(true)}>
              Pilih Event untuk Mulai
            </Button>
          </div>
        )}
      </div>

      {/* Participant sync — shown when event selected */}
      {selectedEventId && (
        <div className="px-4 pb-2">
          <ParticipantSyncStatus eventId={selectedEventId} />
        </div>
      )}

      {/* Bottom tab bar */}
      <nav className="fixed bottom-0 inset-x-0 bg-background border-t border-border flex items-center justify-around min-h-[56px] z-50">
        <button
          onClick={() => setActiveTab('scan')}
          className={`flex flex-col items-center gap-1 flex-1 min-h-[44px] py-2 ${activeTab === 'scan' ? 'text-primary' : 'text-muted-foreground'}`}
        >
          <QrCode className="h-5 w-5" />
          <span className="text-[10px] font-medium">Scan</span>
        </button>
        <button
          onClick={() => setActiveTab('otp')}
          className={`flex flex-col items-center gap-1 flex-1 min-h-[44px] py-2 ${activeTab === 'otp' ? 'text-primary' : 'text-muted-foreground'}`}
        >
          <Key className="h-5 w-5" />
          <span className="text-[10px] font-medium">OTP</span>
        </button>
        <button
          onClick={() => setActiveTab('search')}
          className={`flex flex-col items-center gap-1 flex-1 min-h-[44px] py-2 ${activeTab === 'search' ? 'text-primary' : 'text-muted-foreground'}`}
        >
          <Search className="h-5 w-5" />
          <span className="text-[10px] font-medium">Cari</span>
        </button>
        <button
          onClick={() => {}}
          className="flex flex-col items-center gap-1 flex-1 min-h-[44px] py-2 text-muted-foreground relative"
        >
          <Clock className="h-5 w-5" />
          <span className="text-[10px] font-medium">Riwayat</span>
        </button>
      </nav>

      {/* PWA install banner */}
      <PWAInstallBanner />

      {/* Event selection sheet */}
      <Sheet open={showEventSheet} onOpenChange={setShowEventSheet}>
        <SheetContent side="bottom" className="max-h-[70vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Pilih Event</SheetTitle>
          </SheetHeader>
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-14 bg-muted rounded animate-pulse mx-4 my-2" />
            ))
          ) : (
            <div className="mt-2">
              {data?.data.map((event) => (
                <button
                  key={event.id}
                  className="w-full text-left px-4 py-4 min-h-[56px] text-sm font-medium border-b border-border last:border-0 hover:bg-muted/50 active:bg-muted"
                  onClick={() => {
                    setSelectedEventId(event.id)
                    setShowEventSheet(false)
                  }}
                >
                  {event.name}
                </button>
              ))}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* OTP Recovery Sheet */}
      {selectedEventId && (
        <OTPRecoverySheet
          open={showOTPSheet}
          onClose={() => setShowOTPSheet(false)}
          eventId={selectedEventId}
          onSuccess={handleCheckInSuccess}
        />
      )}

      {/* Name Search Sheet */}
      {selectedEventId && (
        <NameSearchSheet
          open={showSearchSheet}
          onClose={() => setShowSearchSheet(false)}
          eventId={selectedEventId}
          onSuccess={handleCheckInSuccess}
        />
      )}
    </div>
  )
}
