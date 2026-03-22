'use client'

import { use, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { AudiencePreviewCard } from '@/components/undangan/AudiencePreviewCard'
import { BlastHistoryList, type BlastRecord } from '@/components/undangan/BlastHistoryList'
import { BlastConfigSheet } from '@/components/undangan/BlastConfigSheet'
import { BlastProgressBar, type BlastJobStatus } from '@/components/undangan/BlastProgressBar'
import type { Event } from '@/types/api'

interface BlastPageProps {
  params: Promise<{ id: string }>
}

interface Template {
  id: string
  name: string
  channel: 'whatsapp' | 'email'
}

export default function BlastPage({ params }: BlastPageProps) {
  const { id } = use(params)
  const queryClient = useQueryClient()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [activeJobId, setActiveJobId] = useState<string | null>(null)

  // Fetch event for targetCriteria
  const { data: event } = useQuery<Event>({
    queryKey: ['events', id],
    queryFn: () => fetch(`/api/events/${id}`).then((r) => r.json()),
    staleTime: 60_000,
  })

  // Fetch audience preview via POST (on mount when event loaded)
  const { data: audienceData, isLoading: audienceLoading } = useQuery<{ count: number }>({
    queryKey: ['event', id, 'audience-preview'],
    queryFn: () =>
      fetch(`/api/events/${id}/audience-preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event?.targetCriteria ?? {}),
      }).then((r) => r.json()),
    enabled: !!event,
    staleTime: 60_000,
  })

  // Blast history
  const { data: blasts, isLoading: historyLoading, refetch: refetchHistory } = useQuery<BlastRecord[]>({
    queryKey: ['blast', 'history', id],
    queryFn: () =>
      fetch(`/api/blast/history?eventId=${id}`).then((r) => r.json()),
    staleTime: 30_000,
  })

  // Templates for sheet
  const { data: templates = [] } = useQuery<Template[]>({
    queryKey: ['templates'],
    queryFn: () => fetch('/api/templates').then((r) => r.json()),
    staleTime: 60_000,
  })

  // Active blast job status polling
  const { data: activeJob } = useQuery<BlastJobStatus>({
    queryKey: ['blast', activeJobId],
    queryFn: () => fetch(`/api/blast/${activeJobId}`).then((r) => r.json()),
    enabled: !!activeJobId,
    refetchInterval: (query) => {
      const status = query.state.data?.status
      return status === 'running' || status === 'queued' ? 5_000 : false
    },
  })

  function handleBlastSuccess() {
    refetchHistory()
    // In real flow we'd get jobId from POST response and set it
    setActiveJobId('mock-job-1')
  }

  return (
    <div className="space-y-4">
      {/* Audience preview + action */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex-1 w-full">
          <AudiencePreviewCard
            count={audienceData?.count}
            isLoading={audienceLoading || !event}
          />
        </div>
        <Button onClick={() => setSheetOpen(true)} className="shrink-0">
          Kirim Undangan
        </Button>
      </div>

      {/* In-flight blast progress */}
      {activeJobId && (
        <BlastProgressBar job={activeJob} />
      )}

      {/* Blast history */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Riwayat Blast</CardTitle>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : (
            <BlastHistoryList
              blasts={blasts}
              isLoading={false}
              onKirimUndangan={() => setSheetOpen(true)}
            />
          )}
        </CardContent>
      </Card>

      {/* Blast config sheet */}
      <BlastConfigSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        eventId={id}
        templates={templates}
        onSuccess={handleBlastSuccess}
      />
    </div>
  )
}
