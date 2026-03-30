'use client'

import { Progress } from '@/components/ui/progress'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

export interface BlastJobStatus {
  jobId: string
  status: 'queued' | 'running' | 'completed' | 'failed'
  sent: number
  total: number
}

interface BlastProgressBarProps {
  job: BlastJobStatus | undefined
}

export function BlastProgressBar({ job }: BlastProgressBarProps) {
  if (!job || (job.status !== 'queued' && job.status !== 'running')) return null

  const pct = job.total > 0 ? Math.round((job.sent / job.total) * 100) : 0

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="pt-4 space-y-2">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span className="text-sm font-medium">
            {job.status === 'queued' ? 'Blast dalam antrian…' : `Mengirim… ${job.sent.toLocaleString('id-ID')} / ${job.total.toLocaleString('id-ID')}`}
          </span>
        </div>
        <Progress value={pct} className="h-2" />
        <p className="text-xs text-muted-foreground text-right">{pct}% terkirim</p>
      </CardContent>
    </Card>
  )
}
