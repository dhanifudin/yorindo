'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

interface AttendanceStats {
  total: number
  attended: number
  pending: number
}

interface AttendanceMonitorProps {
  eventId: string
  status: string
}

export function AttendanceMonitor({ eventId, status }: AttendanceMonitorProps) {
  const isActive = status === 'active'

  const { data } = useQuery<AttendanceStats>({
    queryKey: ['attendance-stats', eventId],
    queryFn: () => fetch(`/api/events/${eventId}/attendance-stats`).then((r) => r.json()),
    refetchInterval: isActive ? 5000 : false,
    enabled: !!eventId,
  })

  if (!data) return null

  const rate = data.total > 0 ? Math.round((data.attended / data.total) * 100) : 0

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Monitor Kehadiran</h2>
          {isActive && (
            <span className="flex items-center gap-1 text-xs text-green-600">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse inline-block" />
              Live
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <p className="text-2xl font-bold">{data.total}</p>
            <p className="text-xs text-muted-foreground">Total Disetujui</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{data.attended}</p>
            <p className="text-xs text-muted-foreground">Hadir</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-orange-500">{data.pending}</p>
            <p className="text-xs text-muted-foreground">Belum Hadir</p>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Tingkat Kehadiran</span>
            <span>{rate}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 transition-all duration-1000"
              style={{ width: `${rate}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
