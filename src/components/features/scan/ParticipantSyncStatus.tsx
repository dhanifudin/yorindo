'use client'

import { useState, useEffect } from 'react'
import { cacheParticipants, type CachedParticipant } from '@/lib/offline/scanQueue'

type SyncState = 'syncing' | 'synced' | 'error'

interface ParticipantSyncStatusProps {
  eventId: string
}

export function ParticipantSyncStatus({ eventId }: ParticipantSyncStatusProps) {
  const [syncState, setSyncState] = useState<SyncState>('syncing')
  const [cachedCount, setCachedCount] = useState(0)
  const [lastSync, setLastSync] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const sync = async () => {
      setSyncState('syncing')
      try {
        const res = await fetch(`/api/events/${eventId}/participants`)
        if (!res.ok) throw new Error('Fetch failed')
        const { data } = await res.json() as { data: CachedParticipant[] }
        await cacheParticipants(data)
        if (cancelled) return
        setCachedCount(data.length)
        setLastSync(new Date().toLocaleTimeString('id-ID'))
        setSyncState('synced')
      } catch {
        if (!cancelled) setSyncState('error')
      }
    }

    sync()
    return () => { cancelled = true }
  }, [eventId])

  if (syncState === 'syncing') {
    return (
      <p className="text-xs text-blue-500 text-center py-1">Mengunduh data peserta offline…</p>
    )
  }

  if (syncState === 'error') {
    return (
      <p className="text-xs text-destructive text-center py-1">Gagal mengunduh data offline</p>
    )
  }

  return (
    <p className="text-xs text-green-600 text-center py-1">
      {cachedCount} peserta tersimpan offline
      {lastSync && <span className="text-muted-foreground"> · {lastSync}</span>}
    </p>
  )
}
