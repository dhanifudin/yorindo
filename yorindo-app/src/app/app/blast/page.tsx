'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import type { BlastPayload, BlastPrefilledAudience, BlastResponse, Event } from '@/types/api'

interface Template {
  id: string
  name: string
  type: string
  channel: string
  body: string
}

const INDUSTRIES = ['teknologi', 'kesehatan', 'manufaktur', 'keuangan', 'pendidikan', 'retail', 'properti']

export default function BlastPage() {
  const searchParams = useSearchParams()
  const qEventId = searchParams.get('eventId')
  const qSegment = searchParams.get('segment')

  const [prefilledAudience, setPrefilledAudience] = useState<BlastPrefilledAudience | null>(() => {
    if (typeof window === 'undefined') return null
    const raw = sessionStorage.getItem('blast:prefilledAudience')
    if (!raw) return null
    try {
      const parsed = JSON.parse(raw) as BlastPrefilledAudience
      sessionStorage.removeItem('blast:prefilledAudience')
      return parsed
    } catch {
      return null
    }
  })

  const [selectedEvent, setSelectedEvent] = useState(() => prefilledAudience?.eventId ?? qEventId ?? '')
  const [templateId, setTemplateId] = useState('')
  const [channel, setChannel] = useState('whatsapp')
  const [filters, setFilters] = useState({
    serviceType: qSegment || '',
    city: '',
  })
  const [previewCount, setPreviewCount] = useState<number | null>(null)
  const [scheduleEnabled, setScheduleEnabled] = useState(false)
  const [scheduledAtLocal, setScheduledAtLocal] = useState('')
  const [scheduleError, setScheduleError] = useState('')

  const { data: eventsData } = useQuery<{ data: Event[] }>({
    queryKey: ['events'],
    queryFn: () => fetch('/api/events?pageSize=50').then((r) => r.json()),
  })

  const { data: allTemplates } = useQuery<Template[]>({
    queryKey: ['templates'],
    queryFn: () => fetch('/api/templates').then((r) => r.json()),
  })

  // Blast page is for audience invitations only — show invitation templates only
  const templates = (allTemplates ?? []).filter((t) => t.type === 'invitation')

  const previewMutation = useMutation({
    mutationFn: async () => {
      if (!selectedEvent) return { count: 0 }
      const body: Record<string, string> = {}
      if (filters.serviceType) body.serviceType = filters.serviceType
      if (filters.city) body.city = filters.city
      const res = await fetch(`/api/events/${selectedEvent}/audience-preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      return res.json() as Promise<{ count: number }>
    },
    onSuccess: (data) => setPreviewCount(data.count),
  })

  function getScheduledAtUTC(): string | undefined {
    if (!scheduleEnabled || !scheduledAtLocal) return undefined
    return new Date(scheduledAtLocal).toISOString()
  }

  function validateSchedule(): boolean {
    if (!scheduleEnabled) return true
    if (!scheduledAtLocal) {
      setScheduleError('Pilih waktu jadwal.')
      return false
    }
    const minTime = new Date(Date.now() + 5 * 60 * 1000)
    if (new Date(scheduledAtLocal) < minTime) {
      setScheduleError('Jadwal harus minimal 5 menit dari sekarang.')
      return false
    }
    setScheduleError('')
    return true
  }

  const blastMutation = useMutation({
    mutationFn: async () => {
      if (!validateSchedule()) throw new Error('Validasi jadwal gagal')
      const scheduledAt = getScheduledAtUTC()
      const payload: BlastPayload = prefilledAudience
        ? { contactIds: prefilledAudience.contactIds, templateId, channel: channel as BlastPayload['channel'], scheduledAt }
        : { filters, templateId, channel: channel as BlastPayload['channel'], scheduledAt }
      const res = await fetch(`/api/events/${selectedEvent}/blast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Blast gagal')
      return res.json() as Promise<BlastResponse>
    },
    onSuccess: (data) => {
      if (data.status === 'scheduled' && data.scheduledAt) {
        const formatted = new Date(data.scheduledAt).toLocaleString('id-ID', {
          day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
        })
        toast.success(`Blast dijadwalkan untuk ${formatted}`)
      } else {
        toast.success('Blast dikirim!')
      }
    },
    onError: () => toast.error('Gagal mengirim blast'),
  })

  const events = eventsData?.data ?? []

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Kirim Undangan</h1>
      <p className="text-sm text-muted-foreground -mt-4">
        Kirim undangan event ke kontak yang belum mendaftar. Untuk notifikasi ke peserta terdaftar, gunakan Blast Darurat di halaman event.
      </p>

      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold">Pengaturan Blast</h2>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Event</label>
            <Select
              value={selectedEvent}
              onValueChange={prefilledAudience ? undefined : setSelectedEvent}
              disabled={!!prefilledAudience}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih event..." />
              </SelectTrigger>
              <SelectContent>
                {events.map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-xs text-muted-foreground mb-1">
              Template Undangan
            </label>
            <Select value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih template undangan..." />
              </SelectTrigger>
              <SelectContent>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {templates.length === 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Belum ada template undangan. Buat template dengan tipe &quot;invitation&quot; di halaman Template.
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs text-muted-foreground mb-1">Channel</label>
            <Select value={channel} onValueChange={setChannel}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="email">Email</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Audience section — AI mode vs manual filter mode */}
          <div className="border-t pt-4">
            {prefilledAudience ? (
              <div className="rounded-md bg-blue-50 border border-blue-200 p-4">
                <p className="text-sm font-medium text-blue-800 mb-1">
                  🤖 Audiens dari rekomendasi AI: <strong>{prefilledAudience.count} kontak terpilih</strong>
                </p>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-blue-700 h-auto p-0 hover:text-blue-900 mt-1"
                  onClick={() => {
                    setPrefilledAudience(null)
                    setSelectedEvent('')
                  }}
                >
                  Hapus pilihan
                </Button>
              </div>
            ) : (
              <>
                <p className="text-sm font-medium mb-3">Filter Audience</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Industri</label>
                    <select
                      value={filters.serviceType}
                      onChange={(e) => setFilters((p) => ({ ...p, serviceType: e.target.value }))}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                    >
                      <option value="">Semua</option>
                      {INDUSTRIES.map((i) => (
                        <option key={i} value={i}>{i}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Kota</label>
                    <Input
                      value={filters.city}
                      onChange={(e) => setFilters((p) => ({ ...p, city: e.target.value }))}
                      placeholder="Semua kota"
                      className="h-9"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4 mt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => previewMutation.mutate()}
                    disabled={!selectedEvent || previewMutation.isPending}
                  >
                    Preview Audience
                  </Button>
                  {previewCount !== null && (
                    <span className="text-sm">
                      <strong>{previewCount.toLocaleString('id-ID')}</strong> kontak akan dikirim
                      {previewCount === 0 && (
                        <Badge className="ml-2 bg-destructive/10 text-destructive text-xs">Tidak ada penerima</Badge>
                      )}
                    </span>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Schedule section */}
          <div className="border-t pt-4">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="schedule-toggle"
                checked={scheduleEnabled}
                onChange={(e) => {
                  setScheduleEnabled(e.target.checked)
                  if (!e.target.checked) {
                    setScheduledAtLocal('')
                    setScheduleError('')
                  }
                }}
                className="h-4 w-4"
              />
              <label htmlFor="schedule-toggle" className="text-sm font-medium cursor-pointer">
                Jadwalkan Blast
              </label>
            </div>
            {scheduleEnabled && (
              <div className="mt-3">
                <input
                  type="datetime-local"
                  value={scheduledAtLocal}
                  onChange={(e) => {
                    setScheduledAtLocal(e.target.value)
                    setScheduleError('')
                  }}
                  className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                />
                {scheduleError && (
                  <p className="text-xs text-destructive mt-1">{scheduleError}</p>
                )}
              </div>
            )}
          </div>

          <div className="pt-2 border-t">
            <Button
              onClick={() => blastMutation.mutate()}
              disabled={!selectedEvent || !templateId || blastMutation.isPending}
            >
              {scheduleEnabled ? 'Jadwalkan Blast' : 'Kirim Undangan'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
