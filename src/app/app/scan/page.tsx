'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/store/authStore'
import { useEvents } from '@/hooks/useEvents'
import { useAssignedEvents } from '@/hooks/useAssignedEvents'
import { PWAInstallBanner } from '@/components/features/scan/PWAInstallBanner'
import { ParticipantSyncStatus } from '@/components/features/scan/ParticipantSyncStatus'
import { QRScanner } from '@/components/features/scan/QRScanner'
import { OTPRecoverySheet } from '@/components/features/scan/OTPRecoverySheet'
import { NameSearchSheet } from '@/components/features/scan/NameSearchSheet'
import { ScanStatsBar } from '@/components/features/scan/ScanStatsBar'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { QrCode, ChevronDown, Key, Search, Wifi, WifiOff } from 'lucide-react'
import { toast } from 'sonner'
import { getQueueCount, flushScanQueue } from '@/lib/scanQueue'
import { isToday } from '@/lib/dateUtils'

export default function ScanPage() {
  const [selectedEventId, setSelectedEventId] = useState('')
  const [showEventSheet, setShowEventSheet] = useState(false)
  const [showOTPSheet, setShowOTPSheet] = useState(false)
  const [showSearchSheet, setShowSearchSheet] = useState(false)
  const [activeTab, setActiveTab] = useState<'scan' | 'search'>('scan')
  const [isOnline, setIsOnline] = useState(true)
  const [queueCount, setQueueCount] = useState(0)
  const [lastScan, setLastScan] = useState<{ contactName: string; time: Date } | null>(null)

  const { data: allEventsData, isLoading: allEventsLoading } = useEvents()
  const { data: assignedEvents, isLoading: assignedLoading } = useAssignedEvents()

  const accessToken = useAuthStore((s) => s.accessToken)
  const user = useAuthStore((s) => s.user)
  const router = useRouter()
  const searchParams = useSearchParams()

  const isStaff = user?.role === 'staff'
  const isLoading = isStaff ? assignedLoading : allEventsLoading

  const filteredEvents = isStaff
    ? (assignedEvents ?? []).filter((e) => e.status === 'active' && isToday(e.eventDate, e.timezone))
    : (allEventsData?.data ?? []).filter((e) => e.status === 'active')

  useEffect(() => {
    if (!accessToken) {
      router.replace('/login')
      return
    }
    if (user?.role === 'viewer') {
      router.replace('/app')
    }
  }, [accessToken, user, router])

  // URL param pre-select (runs after events load)
  useEffect(() => {
    if (isLoading) return
    const preselect = searchParams.get('eventId')
    if (preselect && !selectedEventId) {
      const found = filteredEvents.find((e) => e.id === preselect)
      if (found) setSelectedEventId(found.id)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading])

  // Auto-select single event for staff (runs after URL param pre-select)
  useEffect(() => {
    if (isLoading || selectedEventId) return
    if (isStaff && filteredEvents.length === 1) {
      setSelectedEventId(filteredEvents[0].id)
    }
  }, [isLoading, filteredEvents.length, isStaff, selectedEventId])

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
    setLastScan({ contactName: result.contactName, time: new Date() })
  }, [])

  if (!accessToken) return null
  if (user?.role === 'admin' || user?.role === 'viewer') return null

  // Staff empty state (after loading)
  if (isStaff && !isLoading && filteredEvents.length === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-8">
        <p className="text-muted-foreground text-center">Tidak ada event aktif yang ditugaskan hari ini.</p>
        <Button asChild>
          <Link href="/app">Kembali ke Dashboard</Link>
        </Button>
      </div>
    )
  }

  const selectedEvent = filteredEvents.find((e) => e.id === selectedEventId)

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
          {selectedEventId && (
            <button
              onClick={() => setShowOTPSheet(true)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground border border-border rounded px-2 py-1"
              title="OTP Recovery"
            >
              <Key className="h-3 w-3" />
              OTP
            </button>
          )}
        </div>
      </header>

      {/* Stats bar */}
      {selectedEventId && (
        <ScanStatsBar
          eventId={selectedEventId}
          capacity={selectedEvent?.capacity ?? 0}
          lastScan={lastScan}
        />
      )}

      {/* Scanner fills remaining space */}
      <div className="flex-1 relative pb-20">
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
        {activeTab === 'search' && (
          selectedEventId ? (
            <div className="p-6 flex flex-col items-center justify-center h-full">
              <p className="text-muted-foreground mb-4 text-sm">Cari peserta berdasarkan nama</p>
              <Button className="h-12 px-8" onClick={() => setShowSearchSheet(true)}>
                Cari Peserta
              </Button>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center p-8">
              <Button onClick={() => setShowEventSheet(true)}>
                Pilih Event untuk Mulai
              </Button>
            </div>
          )
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
          onClick={() => setActiveTab('search')}
          className={`flex flex-col items-center gap-1 flex-1 min-h-[44px] py-2 ${activeTab === 'search' ? 'text-primary' : 'text-muted-foreground'}`}
        >
          <Search className="h-5 w-5" />
          <span className="text-[10px] font-medium">Cari</span>
        </button>
      </nav>

      {/* PWA install banner */}
      <PWAInstallBanner mode="scan" />

      {/* Event selection sheet */}
      <Sheet open={showEventSheet} onOpenChange={setShowEventSheet}>
        <SheetContent side="bottom" className="max-h-[70vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{isStaff ? 'Pilih Event Hari Ini' : 'Pilih Event'}</SheetTitle>
          </SheetHeader>
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-14 bg-muted rounded animate-pulse mx-4 my-2" />
            ))
          ) : (
            <div className="mt-2">
              {filteredEvents.map((event) => (
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
