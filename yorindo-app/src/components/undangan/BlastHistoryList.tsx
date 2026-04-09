'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Mail, MessageCircle } from 'lucide-react'

export interface BlastRecord {
  id: string
  channel: 'whatsapp' | 'email'
  recipientCount: number
  sentCount?: number
  failedCount?: number
  suppressedCount?: number
  sentAt: string
  completedAt?: string | null
  status: 'queued' | 'running' | 'completed' | 'failed' | 'scheduled'
  templateName?: string
}

const STATUS_VARIANT: Record<BlastRecord['status'], 'default' | 'secondary' | 'destructive' | 'outline'> = {
  completed: 'default',
  running: 'secondary',
  queued: 'secondary',
  scheduled: 'outline',
  failed: 'destructive',
}

const STATUS_LABEL: Record<BlastRecord['status'], string> = {
  completed: 'Selesai',
  running: 'Berjalan',
  queued: 'Antrian',
  scheduled: 'Terjadwal',
  failed: 'Gagal',
}

interface BlastHistoryListProps {
  blasts: BlastRecord[] | undefined
  isLoading: boolean
  onKirimUndangan: () => void
}

export function BlastHistoryList({ blasts, isLoading, onKirimUndangan }: BlastHistoryListProps) {
  const items = Array.isArray(blasts) ? blasts : []

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
        <p className="text-muted-foreground text-sm">
          📨 Belum ada undangan terkirim — Kirim blast pertama untuk event ini
        </p>
        <Button onClick={onKirimUndangan}>Kirim Undangan</Button>
      </div>
    )
  }

  return (
    <div className="divide-y">
      {items.map((blast) => {
        // Don't show "Selesai" for jobs with 0 recipients
        const isCompleted = blast.status === 'completed' && blast.recipientCount > 0
        const displayStatus = isCompleted
          ? blast.status
          : blast.recipientCount === 0 && blast.status === 'queued'
            ? 'queued'
            : blast.status

        const progressText = blast.sentCount != null && blast.recipientCount > 0
          ? `${blast.sentCount.toLocaleString('id-ID')} / ${blast.recipientCount.toLocaleString('id-ID')}`
          : null

        return (
          <div key={blast.id} className="flex items-center gap-3 py-3">
            <div className="rounded-full bg-muted p-2 shrink-0">
              {blast.channel === 'whatsapp' ? (
                <MessageCircle className="h-4 w-4 text-green-600" />
              ) : (
                <Mail className="h-4 w-4 text-blue-600" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium capitalize">
                {blast.channel}
                {blast.templateName && (
                  <span className="font-normal text-muted-foreground"> — {blast.templateName}</span>
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                {blast.recipientCount > 0
                  ? `${blast.recipientCount.toLocaleString('id-ID')} penerima`
                  : '0 penerima'}
                {progressText && ` · ${progressText} terkirim`}
                {' · '}
                {new Date(blast.sentAt).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
            <Badge variant={STATUS_VARIANT[displayStatus]}>{STATUS_LABEL[displayStatus]}</Badge>
          </div>
        )
      })}
    </div>
  )
}
