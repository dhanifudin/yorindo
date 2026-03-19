'use client'

import { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Skeleton } from '@/components/ui/skeleton'

interface AttendanceStats {
  total: number
  attended: number
  pending: number
}

interface Props {
  eventId: string
  capacity: number
  lastScan: { contactName: string; time: Date } | null
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return `${seconds}d lalu`
  return `${Math.floor(seconds / 60)}m lalu`
}

export function ScanStatsBar({ eventId, capacity, lastScan }: Props) {
  const [collapsed, setCollapsed] = useState(false)
  const lastScrollY = useRef(0)

  const { data, isLoading } = useQuery<AttendanceStats>({
    queryKey: ['attendance-stats', eventId],
    queryFn: () => fetch(`/api/events/${eventId}/attendance-stats`).then((r) => r.json()),
    refetchInterval: 10_000,
  })

  useEffect(() => {
    const onScroll = () => {
      const current = window.scrollY
      setCollapsed(current > lastScrollY.current && current > 40)
      lastScrollY.current = current
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  if (isLoading) {
    return <Skeleton className="h-10 mx-4 my-2" />
  }

  const attended = data?.attended ?? 0
  const cap = capacity > 0 ? capacity : (data?.total ?? 0)
  const percent = cap > 0 ? Math.round((attended / cap) * 100) : 0

  return (
    <div className={`transition-all overflow-hidden ${collapsed ? 'max-h-0' : 'max-h-20'}`}>
      <div className="px-4 py-2 bg-muted/50 border-b border-border">
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="font-medium">Check-in: {attended} / {cap}</span>
          {lastScan && (
            <span className="text-xs text-muted-foreground">
              {lastScan.contactName} — {formatTimeAgo(lastScan.time)}
            </span>
          )}
        </div>
        <div className="w-full bg-background rounded-full h-1.5">
          <div
            className="bg-primary h-1.5 rounded-full transition-all"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    </div>
  )
}
