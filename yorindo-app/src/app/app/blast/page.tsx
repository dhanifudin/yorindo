'use client'

import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import type { Event } from '@/types/api'

interface Template {
  id: string
  name: string
  type: string
  channel: string
  body: string
}

const INDUSTRIES = ['teknologi', 'kesehatan', 'manufaktur', 'keuangan', 'pendidikan', 'retail', 'properti']

export default function BlastPage() {
  const [selectedEvent, setSelectedEvent] = useState('')
  const [templateId, setTemplateId] = useState('')
  const [channel, setChannel] = useState('whatsapp')
  const [filters, setFilters] = useState({ industry: '', city: '', companySize: '' })
  const [previewCount, setPreviewCount] = useState<number | null>(null)
  const [emergencyOpen, setEmergencyOpen] = useState(false)
  const [emergencyMsg, setEmergencyMsg] = useState('')

  const { data: eventsData } = useQuery<{ data: Event[] }>({
    queryKey: ['events'],
    queryFn: () => fetch('/api/events?pageSize=50').then((r) => r.json()),
  })

  const { data: templates } = useQuery<Template[]>({
    queryKey: ['templates'],
    queryFn: () => fetch('/api/templates').then((r) => r.json()),
  })

  const previewMutation = useMutation({
    mutationFn: async () => {
      if (!selectedEvent) return { count: 0 }
      const body: Record<string, string> = {}
      if (filters.industry) body.industry = filters.industry
      if (filters.city) body.city = filters.city
      if (filters.companySize) body.companySize = filters.companySize
      const res = await fetch(`/api/events/${selectedEvent}/audience-preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      return res.json() as Promise<{ count: number }>
    },
    onSuccess: (data) => setPreviewCount(data.count),
  })

  const blastMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/events/${selectedEvent}/blast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filters, templateId, channel }),
      })
      if (!res.ok) throw new Error('Blast gagal')
      return res.json()
    },
    onSuccess: (data) => toast.success(`Blast dijadwalkan. Job ID: ${data.jobId}`),
    onError: () => toast.error('Gagal mengirim blast'),
  })

  const emergencyMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/events/${selectedEvent}/blast/emergency`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: emergencyMsg, channel }),
      })
      if (!res.ok) throw new Error('Emergency blast gagal')
      return res.json()
    },
    onSuccess: (data) => {
      toast.success(`Emergency blast dikirim ke ${data.recipientCount} peserta`)
      setEmergencyOpen(false)
      setEmergencyMsg('')
    },
    onError: () => toast.error('Gagal mengirim emergency blast'),
  })

  const events = eventsData?.data ?? []

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Konfigurasi Blast</h1>

      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold">Pengaturan Blast</h2>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Event</label>
            <Select value={selectedEvent} onValueChange={setSelectedEvent}>
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
            <label className="block text-xs text-muted-foreground mb-1">Template</label>
            <Select value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih template..." />
              </SelectTrigger>
              <SelectContent>
                {(templates ?? []).map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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

          <div className="border-t pt-4">
            <p className="text-sm font-medium mb-3">Filter Audience</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Industri</label>
                <select
                  value={filters.industry}
                  onChange={(e) => setFilters((p) => ({ ...p, industry: e.target.value }))}
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
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Ukuran Perusahaan</label>
                <select
                  value={filters.companySize}
                  onChange={(e) => setFilters((p) => ({ ...p, companySize: e.target.value }))}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                >
                  <option value="">Semua</option>
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                  <option value="enterprise">Enterprise</option>
                </select>
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
          </div>

          <div className="flex gap-2 pt-2 border-t">
            <Button
              onClick={() => blastMutation.mutate()}
              disabled={!selectedEvent || !templateId || blastMutation.isPending}
            >
              Kirim Blast
            </Button>
            <Button
              variant="destructive"
              onClick={() => setEmergencyOpen(true)}
              disabled={!selectedEvent}
            >
              Emergency Blast
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Emergency Blast Dialog */}
      <Dialog open={emergencyOpen} onOpenChange={(v) => !v && setEmergencyOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Emergency Blast</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Blast darurat akan dikirim ke <strong>semua peserta yang sudah disetujui</strong> segera.
          </p>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Pesan</label>
            <textarea
              value={emergencyMsg}
              onChange={(e) => setEmergencyMsg(e.target.value)}
              rows={4}
              className="w-full border rounded-md px-3 py-2 text-sm"
              placeholder="Tulis pesan darurat..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmergencyOpen(false)}>Batal</Button>
            <Button
              variant="destructive"
              onClick={() => emergencyMutation.mutate()}
              disabled={!emergencyMsg.trim() || emergencyMutation.isPending}
            >
              {emergencyMutation.isPending ? 'Mengirim…' : 'Kirim Sekarang'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
