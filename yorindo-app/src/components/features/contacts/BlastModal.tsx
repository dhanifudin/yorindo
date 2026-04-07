'use client'

import { useCallback, useEffect, useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'

// ─── Schema ──────────────────────────────────────────────────────────────────

const blastSchema = z.object({
  eventId: z.string().min(1, 'Pilih event'),
  channel: z.enum(['whatsapp', 'email']),
  messageType: z.enum(['template', 'custom']),
  templateId: z.string().optional(),
  customMessage: z.string().optional(),
}).refine(
  (data) => {
    if (data.messageType === 'template') return !!data.templateId
    if (data.messageType === 'custom') return (data.customMessage?.trim().length ?? 0) >= 10
    return false
  },
  {
    message: 'Isi pesan wajib diisi (minimal 10 karakter untuk pesan kustom)',
    path: ['templateId'],
  }
)

type BlastFormValues = z.infer<typeof blastSchema>

// ─── Props ───────────────────────────────────────────────────────────────────

interface BlastModalProps {
  open: boolean
  onClose: () => void
  onBlastSuccess?: () => void
  recipientCount: number
  mode: 'segment' | 'selection'
  selectedIds: string[]
}

// ─── Component ───────────────────────────────────────────────────────────────

export function BlastModal({
  open,
  onClose,
  onBlastSuccess,
  recipientCount,
  mode,
  selectedIds,
}: BlastModalProps) {
  const [activeTab, setActiveTab] = useState<'template' | 'custom'>('template')

  const form = useForm<BlastFormValues>({
    resolver: zodResolver(blastSchema),
    defaultValues: {
      eventId: '',
      channel: 'whatsapp',
      messageType: 'template',
      templateId: '',
      customMessage: '',
    },
  })

  const channel = form.watch('channel')

  // ── Queries ─────────────────────────────────────────────────────────────────

  const { data: eventsData, isLoading: eventsLoading } = useQuery({
    queryKey: ['events', 'published'],
    queryFn: async () => {
      const res = await fetch('/api/events?status=published&pageSize=50')
      return res.json() as Promise<{ data: Array<{ id: string; name: string; status: string }> }>
    },
    staleTime: 60_000,
    enabled: open,
  })

  const { data: allTemplates } = useQuery({
    queryKey: ['templates'],
    queryFn: async () => {
      const res = await fetch('/api/templates')
      return res.json() as Promise<Array<{ id: string; name: string; channel: 'email' | 'whatsapp'; type: string }>>
    },
    staleTime: 60_000,
    enabled: open,
  })

  const filteredTemplates = (allTemplates ?? []).filter((t) => t.channel === channel)

  // Reset templateId when channel changes
  useEffect(() => {
    form.setValue('templateId', '')
  }, [channel, form])

  // Sync activeTab → form messageType
  useEffect(() => {
    form.setValue('messageType', activeTab)
  }, [activeTab, form])

  // ── Mutation ─────────────────────────────────────────────────────────────────

  const { mutate: submitBlast, isPending } = useMutation({
    mutationFn: async (values: BlastFormValues) => {
      const res = await fetch('/api/blast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: values.eventId,
          channel: values.channel,
          templateId: values.templateId ?? 'custom',
          recipientCount,
          selectedIds: mode === 'selection' ? selectedIds : undefined,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error?.message ?? 'Blast gagal')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success(`Blast dijadwalkan untuk ${recipientCount} kontak`)
      onBlastSuccess?.()
      handleClose()
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Blast gagal, coba lagi')
    },
  })

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleClose = useCallback(() => {
    form.reset()
    setActiveTab('template')
    onClose()
  }, [form, onClose])

  const onSubmit = (values: BlastFormValues) => {
    submitBlast(values)
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Kirim Blast</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Recipient badge */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Penerima:</span>
            <Badge variant="secondary">{recipientCount} kontak</Badge>
            {mode === 'selection' && (
              <span className="text-xs text-muted-foreground">(dipilih manual)</span>
            )}
          </div>

          {/* Event selector */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Event *</label>
            {eventsLoading ? (
              <Skeleton className="h-9 w-full" />
            ) : (
              <Controller
                name="eventId"
                control={form.control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange} disabled={eventsLoading}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih event" />
                    </SelectTrigger>
                    <SelectContent>
                      {(eventsData?.data ?? []).map((e) => (
                        <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            )}
          </div>

          {/* Channel radio */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Channel *</label>
            <Controller
              name="channel"
              control={form.control}
              render={({ field }) => (
                <RadioGroup
                  value={field.value}
                  onValueChange={field.onChange}
                  className="flex gap-4"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="whatsapp" id="ch-wa" />
                    <label htmlFor="ch-wa" className="text-sm cursor-pointer">WhatsApp</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="email" id="ch-email" />
                    <label htmlFor="ch-email" className="text-sm cursor-pointer">Email</label>
                  </div>
                </RadioGroup>
              )}
            />
          </div>

          {/* Message type tabs */}
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as 'template' | 'custom')}
          >
            <TabsList className="w-full">
              <TabsTrigger value="template" className="flex-1">Template</TabsTrigger>
              <TabsTrigger value="custom" className="flex-1">Pesan Kustom</TabsTrigger>
            </TabsList>

            <TabsContent value="template" className="mt-3">
              <Controller
                name="templateId"
                control={form.control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={filteredTemplates.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          filteredTemplates.length === 0
                            ? 'Tidak ada template untuk channel ini'
                            : 'Pilih template'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredTemplates.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </TabsContent>

            <TabsContent value="custom" className="mt-3 space-y-1.5">
              <Controller
                name="customMessage"
                control={form.control}
                render={({ field }) => (
                  <Textarea {...field} placeholder="Tulis pesan..." rows={4} />
                )}
              />
              <p className="text-xs text-muted-foreground">
                Variabel tersedia: <code>{'{{name}}'}</code> <code>{'{{event_title}}'}</code>
              </p>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={handleClose} disabled={isPending}>
            Batal
          </Button>
          <Button
            onClick={form.handleSubmit(onSubmit)}
            disabled={!form.formState.isValid || isPending}
          >
            {isPending
              ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Mengirim...</>
              : 'Kirim Blast'
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
