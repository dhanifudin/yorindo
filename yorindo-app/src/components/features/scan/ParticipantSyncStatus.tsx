'use client'

import { useState } from 'react'
import { cacheParticipants, type CachedParticipant } from '@/lib/offline/scanQueue'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

type SyncState = 'idle' | 'syncing' | 'synced' | 'error'

interface ParticipantSyncStatusProps {
  eventId: string
}

export function ParticipantSyncStatus({ eventId }: ParticipantSyncStatusProps) {
  const [syncState, setSyncState] = useState<SyncState>('idle')
  const [cachedCount, setCachedCount] = useState(0)
  const [lastSync, setLastSync] = useState<string | null>(null)

  const handleSync = async () => {
    setSyncState('syncing')
    try {
      const res = await fetch(`/api/events/${eventId}/participants`)
      if (!res.ok) throw new Error('Fetch failed')
      const { data } = await res.json() as { data: CachedParticipant[] }
      await cacheParticipants(data)
      setCachedCount(data.length)
      setLastSync(new Date().toLocaleTimeString('id-ID'))
      setSyncState('synced')
    } catch {
      setSyncState('error')
    }
  }

  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="font-semibold text-sm">Data Peserta Offline</p>
            {syncState === 'synced' && (
              <p className="text-xs text-green-600 mt-0.5">
                {cachedCount} peserta tersimpan offline — Siap check-in!
              </p>
            )}
            {syncState === 'idle' && (
              <p className="text-xs text-muted-foreground mt-0.5">Belum disinkronkan</p>
            )}
            {syncState === 'error' && (
              <p className="text-xs text-destructive mt-0.5">Gagal sinkronisasi. Coba lagi.</p>
            )}
            {syncState === 'syncing' && (
              <p className="text-xs text-blue-500 mt-0.5">Sedang mengunduh...</p>
            )}
          </div>
          {lastSync && (
            <p className="text-xs text-muted-foreground">Terakhir: {lastSync}</p>
          )}
        </div>
        <Button
          className="w-full"
          disabled={syncState === 'syncing'}
          onClick={handleSync}
        >
          {syncState === 'syncing' ? 'Mengunduh...' : 'Sync Data Peserta'}
        </Button>
      </CardContent>
    </Card>
  )
}
