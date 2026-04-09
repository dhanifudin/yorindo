'use client'

import { use, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { AudienceTargetList } from '@/components/undangan/AudienceTargetList'
import { BlastHistoryList, type BlastRecord } from '@/components/undangan/BlastHistoryList'
import { BlastConfigSheet } from '@/components/undangan/BlastConfigSheet'
import { BlastProgressBar, type BlastJobStatus } from '@/components/undangan/BlastProgressBar'
import { EmergencyBlastSheet } from '@/components/undangan/EmergencyBlastSheet'
import type { Event, AudiencePreviewResponse } from '@/types/api'

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
  const [sheetOpen, setSheetOpen] = useState(false)
  const [showEmergencySheet, setShowEmergencySheet] = useState(false)
  const [activeJobId, setActiveJobId] = useState<string | null>(null)
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set())

  // Fetch event for targetCriteria
  const { data: event } = useQuery<Event>({
    queryKey: ['events', id],
    queryFn: () => fetch(`/api/events/${id}`).then((r) => r.json()),
    staleTime: 60_000,
  })

  // Fetch audience preview via POST (on mount when event loaded)
  const { data: audienceData, isLoading: audienceLoading } = useQuery<AudiencePreviewResponse>({
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

  // Reset selection when audience data changes
  const contacts = audienceData?.contacts ?? []
  const totalContacts = audienceData?.totalContacts ?? 0

  // Blast history
  const { data: blasts, isLoading: historyLoading, refetch: refetchHistory } = useQuery<BlastRecord[]>({
    queryKey: ['blast', 'history', id],
    queryFn: () =>
      fetch(`/api/blast/history?eventId=${id}`).then((r) => r.json()),
    staleTime: 30_000,
  })

  // Approved registrant count for emergency blast
  const { data: approvedCountData } = useQuery<{ pagination: { total: number } }>({
    queryKey: ['event-registrations-count', id, 'approved'],
    queryFn: () =>
      fetch(`/api/registrations?eventId=${id}&status=approved&pageSize=1`).then((r) => r.json()),
    enabled: !!id,
    staleTime: 30_000,
  })
  const approvedCount = approvedCountData?.pagination.total ?? 0

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
    setSelectedContactIds(new Set())
    setActiveJobId('mock-job-1')
  }

  return (
    <div className="space-y-4">
      {/* Audience target list with selection */}
      <AudienceTargetList
        contacts={contacts}
        totalContacts={totalContacts}
        isLoading={audienceLoading || !event}
        selectedIds={selectedContactIds}
        onSelectionChange={setSelectedContactIds}
      />

      {/* Action bar */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {selectedContactIds.size > 0
            ? `${selectedContactIds.size} kontak dipilih`
            : 'Pilih kontak di atas atau kirim ke semua audiens'}
        </p>
        <Button onClick={() => setSheetOpen(true)} disabled={audienceLoading}>
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

      {/* Emergency blast section */}
      <div className="border-t border-border pt-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Pemberitahuan Darurat</p>
            <p className="text-xs text-muted-foreground">
              Kirim pesan mendesak ke {approvedCount} peserta yang disetujui
            </p>
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowEmergencySheet(true)}
          >
            Kirim Pemberitahuan Darurat
          </Button>
        </div>
      </div>

      {/* Blast config sheet */}
      <BlastConfigSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        eventId={id}
        templates={templates}
        selectedContactIds={selectedContactIds.size > 0 ? Array.from(selectedContactIds) : undefined}
        onSuccess={handleBlastSuccess}
      />

      {/* Emergency blast sheet */}
      <EmergencyBlastSheet
        open={showEmergencySheet}
        onOpenChange={setShowEmergencySheet}
        eventId={id}
        approvedCount={approvedCount}
      />
    </div>
  )
}
