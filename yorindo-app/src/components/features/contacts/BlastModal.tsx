'use client'

import { useCallback, useEffect, useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, Send } from 'lucide-react'
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
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

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
  },
)

type BlastFormValues = z.infer<typeof blastSchema>

// ─── Types ────────────────────────────────────────────────────────────────────

interface EventItem {
  id: string
  name: string
  date: string
}

interface TemplateItem {
  id: string
  name: string
  channel: 'email' | 'whatsapp'
  type: string
  body: string
  subject?: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(date: string) {
  // Parse date-only strings as local time to avoid UTC off-by-one
  const [y, m, d] = date.slice(0, 10).split('-').map(Number)
  return new Date(y!, m! - 1, d!).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface BlastModalProps {
  open: boolean
  onClose: () => void
  onBlastSuccess?: () => void
  recipientCount: number
  mode: 'segment' | 'selection'
  selectedIds: string[]
  selectedNames?: string[]
}

// ─── Component ────────────────────────────────────────────────────────────────

export function BlastModal({
  open,
  onClose,
  onBlastSuccess,
  recipientCount,
  mode,
  selectedIds,
  selectedNames = [],
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
  const templateId = form.watch('templateId')

  useEffect(() => {
    form.setValue('templateId', '')
  }, [channel, form])

  useEffect(() => {
    form.setValue('messageType', activeTab)
  }, [activeTab, form])

  const handleClose = useCallback(() => {
    form.reset()
    setActiveTab('template')
    onClose()
  }, [form, onClose])

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data: eventsData, isLoading: eventsLoading } = useQuery({
    queryKey: ['events', 'published'],
    queryFn: async () => {
      const res = await fetch('/api/events?status=published&pageSize=50')
      return res.json() as Promise<{ data: EventItem[] }>
    },
    staleTime: 60_000,
    enabled: open,
  })

  const { data: allTemplates } = useQuery({
    queryKey: ['templates'],
    queryFn: async () => {
      const res = await fetch('/api/templates')
      return res.json() as Promise<TemplateItem[]>
    },
    staleTime: 60_000,
    enabled: open,
  })

  const sortedEvents = [...(eventsData?.data ?? [])].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  )

  const filteredTemplates = (allTemplates ?? []).filter((t) => t.channel === channel)
  const selectedTemplate = filteredTemplates.find((t) => t.id === templateId)

  // ── Mutation ───────────────────────────────────────────────────────────────

  const { mutate: sendBlast, isPending } = useMutation({
    mutationFn: async (values: BlastFormValues) => {
      const res = await fetch(`/api/events/${encodeURIComponent(values.eventId)}/blast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: values.channel,
          ...(values.messageType === 'template'
            ? { templateId: values.templateId }
            : { customMessage: values.customMessage }),
          ...(mode === 'selection' ? { contactIds: selectedIds } : {}),
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
      toast.error(err instanceof Error ? err.message : 'Blast gagal')
    },
  })

  const onSubmit = (values: BlastFormValues) => sendBlast(values)

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleClose() }}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-4 h-4" />
            Kirim Blast
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">

          {/* Contact preview */}
          <div className="space-y-1.5">
            <Label className="text-sm text-muted-foreground">
              {mode === 'selection'
                ? `Penerima (${recipientCount} kontak dipilih)`
                : `Penerima (${recipientCount} kontak di segmen)`}
            </Label>
            {mode === 'selection' && selectedNames.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 rounded-md border bg-muted/30">
                {selectedNames.map((name, i) => (
                  <Badge key={selectedIds[i] ?? i} variant="secondary" className="text-xs font-normal">
                    {name}
                  </Badge>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{recipientCount} kontak</Badge>
                {mode === 'segment' && (
                  <span className="text-xs text-muted-foreground">dari filter aktif</span>
                )}
              </div>
            )}
          </div>

          {/* Event card list */}
          <div className="space-y-1.5">
            <Label>Event *</Label>
            <Controller
              name="eventId"
              control={form.control}
              render={({ field }) => (
                <div className="max-h-48 overflow-y-auto space-y-2 rounded-md border p-2">
                  {eventsLoading ? (
                    <>
                      <Skeleton className="h-14 w-full rounded-md" />
                      <Skeleton className="h-14 w-full rounded-md" />
                      <Skeleton className="h-14 w-full rounded-md" />
                    </>
                  ) : sortedEvents.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">
                      Tidak ada event yang dipublikasikan
                    </p>
                  ) : (
                    sortedEvents.map((e) => (
                      <button
                        key={e.id}
                        type="button"
                        onClick={() => field.onChange(e.id)}
                        className={cn(
                          'w-full text-left rounded-md border px-3 py-2.5 transition-all',
                          field.value === e.id
                            ? 'ring-2 ring-primary border-primary bg-primary/5'
                            : 'hover:bg-muted/50',
                        )}
                      >
                        <p className="text-sm font-medium">{e.name}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(e.date)}</p>
                      </button>
                    ))
                  )}
                </div>
              )}
            />
            {form.formState.errors.eventId && (
              <p className="text-xs text-destructive">{form.formState.errors.eventId.message}</p>
            )}
          </div>

          {/* Channel radio */}
          <div className="space-y-1.5">
            <Label>Channel *</Label>
            <Controller
              name="channel"
              control={form.control}
              render={({ field }) => (
                <RadioGroup value={field.value} onValueChange={field.onChange} className="flex gap-4">
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

          {/* Message tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'template' | 'custom')}>
            <TabsList className="w-full">
              <TabsTrigger value="template" className="flex-1">Template Undangan</TabsTrigger>
              <TabsTrigger value="custom" className="flex-1">Pesan Kustom</TabsTrigger>
            </TabsList>

            <TabsContent value="template" className="mt-3 space-y-2">
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
                      <SelectValue placeholder={
                        filteredTemplates.length === 0
                          ? `Tidak ada template ${channel === 'whatsapp' ? 'WhatsApp' : 'Email'}`
                          : 'Pilih template'
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredTemplates.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />

              {/* Template preview */}
              {selectedTemplate && (
                <div className="rounded-md border bg-muted/40 p-3 space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Preview</p>
                  {selectedTemplate.subject && (
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium">Subjek:</span> {selectedTemplate.subject}
                    </p>
                  )}
                  <p className="text-sm whitespace-pre-wrap">{selectedTemplate.body}</p>
                </div>
              )}

              {form.formState.errors.templateId && (
                <p className="text-xs text-destructive">{form.formState.errors.templateId.message}</p>
              )}
            </TabsContent>

            <TabsContent value="custom" className="mt-3 space-y-1.5">
              <Controller
                name="customMessage"
                control={form.control}
                render={({ field }) => (
                  <Textarea
                    {...field}
                    placeholder="Tulis pesan blast kustom Anda..."
                    rows={5}
                  />
                )}
              />
              <p className="text-xs text-muted-foreground">
                Variabel: <code className="bg-muted px-1 rounded">{'{{name}}'}</code>{' '}
                <code className="bg-muted px-1 rounded">{'{{event_title}}'}</code>
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
            className="gap-2"
          >
            {isPending
              ? <><Loader2 className="h-4 w-4 animate-spin" />Mengirim...</>
              : <><Send className="h-4 w-4" />Kirim Blast</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
