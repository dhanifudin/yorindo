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
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { TemplatePreview } from '@/components/features/templates/TemplatePreview'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Check, ChevronsUpDown } from 'lucide-react'

// ─── Schema ──────────────────────────────────────────────────────────────────

const blastSchema = z.object({
  eventId: z.string().min(1, 'Pilih event'),
  templateId: z.string().min(1, 'Pilih template undangan'),
  scheduleMode: z.enum(['now', 'later']),
  scheduledDate: z.string().optional(),
  scheduledTime: z.string().optional(),
})

type BlastFormValues = z.infer<typeof blastSchema>

// ─── Types ────────────────────────────────────────────────────────────────────

interface EventItem {
  id: string
  name: string
  date: string | null | undefined
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

function formatDate(date: string | null | undefined): string {
  if (!date) return ''
  const [y, m, d] = date.slice(0, 10).split('-').map(Number)
  return new Date(y!, m! - 1, d!).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface SegmentFilters {
  serviceTypes?: string[]
  cities?: string[]
  jobTitles?: string[]
}

interface BlastModalProps {
  open: boolean
  onClose: () => void
  onBlastSuccess?: () => void
  recipientCount: number
  mode: 'segment' | 'selection'
  selectedIds: string[]
  selectedNames?: string[]
  segmentFilters?: SegmentFilters
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
  segmentFilters,
}: BlastModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateItem | null>(null)
  const [eventPopoverOpen, setEventPopoverOpen] = useState(false)
  const [templatePopoverOpen, setTemplatePopoverOpen] = useState(false)

  const form = useForm<BlastFormValues>({
    resolver: zodResolver(blastSchema),
    defaultValues: {
      eventId: '',
      templateId: '',
      scheduleMode: 'now',
    },
  })

  const scheduleMode = form.watch('scheduleMode')

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data: eventsData, isLoading: eventsLoading } = useQuery({
    queryKey: ['events', 'blast'],
    queryFn: async () => {
      const res = await fetch('/api/events?status=active&pageSize=50')
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
    (a, b) => new Date(a.date ?? 0).getTime() - new Date(b.date ?? 0).getTime(),
  )

  // Email invitation templates only
  const invitationTemplates = (allTemplates ?? [])
    .filter((t) => t.channel === 'email' && t.type === 'invitation')

  const selectedEvent = sortedEvents.find((e) => e.id === form.watch('eventId'))

  // Auto-select first template on open
  useEffect(() => {
    if (open && invitationTemplates.length > 0 && !selectedTemplate) {
      const first = invitationTemplates[0]
      form.setValue('templateId', first.id, { shouldValidate: true })
      setSelectedTemplate(first)
    }
  }, [open, invitationTemplates, selectedTemplate, form])

  // Reset on close
  const handleClose = useCallback(() => {
    form.reset()
    setSelectedTemplate(null)
    setEventPopoverOpen(false)
    setTemplatePopoverOpen(false)
    onClose()
  }, [form, onClose])

  // ── Mutation ───────────────────────────────────────────────────────────────

  const { mutate: sendBlast, isPending } = useMutation({
    mutationFn: async (values: BlastFormValues) => {
      const body: Record<string, unknown> = {
        channel: 'email',
        templateId: values.templateId,
      }

      if (values.scheduleMode === 'later' && values.scheduledDate && values.scheduledTime) {
        body.scheduledAt = `${values.scheduledDate}T${values.scheduledTime}:00.000Z`
      }

      if (mode === 'selection') {
        body.contactIds = selectedIds
      } else if (segmentFilters && Object.values(segmentFilters).some((v) => v?.length)) {
        body.filters = segmentFilters
      }

      const res = await fetch(`/api/events/${encodeURIComponent(values.eventId)}/blast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}))
        throw new Error(errBody?.error?.message ?? 'Blast gagal')
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
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="px-0 pt-0">
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-4 h-4" />
            Kirim Blast
          </DialogTitle>
          <DialogDescription>
            Pilih event, template, dan jadwal pengiriman blast
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-1">
            {/* Left column — Controls */}
            <div className="space-y-5">

              {/* Event selector */}
              <div className="space-y-2">
                <Label>Event *</Label>
                <Popover open={eventPopoverOpen} onOpenChange={setEventPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={eventPopoverOpen}
                      className="w-full justify-between font-normal"
                    >
                      {selectedEvent
                        ? selectedEvent.name
                        : 'Pilih event…'}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                    <Command>
                      <CommandInput placeholder="Cari event…" />
                      <CommandEmpty>Tidak ada event dipublikasikan</CommandEmpty>
                      <CommandList>
                        <CommandGroup>
                          {eventsLoading ? (
                            <div className="py-2 px-3 space-y-2">
                              <Skeleton className="h-10 w-full" />
                              <Skeleton className="h-10 w-full" />
                            </div>
                          ) : sortedEvents.length === 0 ? (
                            <p className="py-4 text-center text-sm text-muted-foreground">
                              Tidak ada event
                            </p>
                          ) : (
                            sortedEvents.map((e) => (
                              <CommandItem
                                key={e.id}
                                value={e.id}
                                onSelect={() => {
                                  form.setValue('eventId', e.id, { shouldValidate: true })
                                  setEventPopoverOpen(false)
                                }}
                              >
                                <Check
                                  className={cn(
                                    'mr-2 h-4 w-4',
                                    selectedEvent?.id === e.id ? 'opacity-100' : 'opacity-0'
                                  )}
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm truncate">{e.name}</p>
                                  <p className="text-xs text-muted-foreground">{formatDate(e.date)}</p>
                                </div>
                              </CommandItem>
                            ))
                          )}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {form.formState.errors.eventId && (
                  <p className="text-xs text-destructive">{form.formState.errors.eventId.message}</p>
                )}
              </div>

              {/* Template selector */}
              <div className="space-y-2">
                <Label>Template Undangan *</Label>
                <Popover open={templatePopoverOpen} onOpenChange={setTemplatePopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={templatePopoverOpen}
                      className="w-full justify-between font-normal"
                    >
                      {selectedTemplate
                        ? selectedTemplate.name
                        : 'Pilih template…'}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                    <Command>
                      <CommandInput placeholder="Cari template…" />
                      <CommandEmpty>Tidak ada template undangan email</CommandEmpty>
                      <CommandList>
                        <CommandGroup>
                          {invitationTemplates.map((t) => (
                            <CommandItem
                              key={t.id}
                              value={t.id}
                              onSelect={() => {
                                form.setValue('templateId', t.id, { shouldValidate: true })
                                setSelectedTemplate(t)
                                setTemplatePopoverOpen(false)
                              }}
                            >
                              <Check
                                className={cn(
                                  'mr-2 h-4 w-4',
                                  selectedTemplate?.id === t.id ? 'opacity-100' : 'opacity-0'
                                )}
                              />
                              {t.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {form.formState.errors.templateId && (
                  <p className="text-xs text-destructive">{form.formState.errors.templateId.message}</p>
                )}
              </div>

              {/* Schedule mode */}
              <div className="space-y-2">
                <Label>Jadwal Pengiriman</Label>
                <RadioGroup
                  value={scheduleMode}
                  onValueChange={(val) =>
                    form.setValue('scheduleMode', val as 'now' | 'later', { shouldValidate: true })
                  }
                  className="flex flex-col gap-3"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="now" id="schedule-now" />
                    <Label htmlFor="schedule-now" className="cursor-pointer font-normal">
                      Kirim Sekarang
                    </Label>
                  </div>
                  <div className="flex items-start gap-2">
                    <RadioGroupItem value="later" id="schedule-later" className="mt-1" />
                    <div className="flex-1 space-y-2">
                      <Label htmlFor="schedule-later" className="cursor-pointer font-normal">
                        Jadwalkan
                      </Label>
                      {scheduleMode === 'later' && (
                        <div className="grid grid-cols-2 gap-3 mt-1">
                          <div>
                            <Label htmlFor="scheduledDate" className="text-xs text-muted-foreground">
                              Tanggal
                            </Label>
                            <Input
                              id="scheduledDate"
                              type="date"
                              min={new Date().toISOString().split('T')[0]}
                              {...form.register('scheduledDate')}
                            />
                          </div>
                          <div>
                            <Label htmlFor="scheduledTime" className="text-xs text-muted-foreground">
                              Waktu
                            </Label>
                            <Input
                              id="scheduledTime"
                              type="time"
                              defaultValue="09:00"
                              {...form.register('scheduledTime')}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </RadioGroup>
              </div>
            </div>

            {/* Right column — Preview + Recipients */}
            <div className="space-y-4">
              {/* Recipients */}
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">
                  {mode === 'selection'
                    ? `Penerima (${recipientCount} kontak)`
                    : `Penerima (${recipientCount} kontak dari filter)`}
                </Label>
                {mode === 'selection' && selectedNames.length > 0 && selectedNames.length <= 20 ? (
                  <div className="flex flex-wrap gap-1.5 p-2 rounded-md border bg-muted/30 max-h-20 overflow-y-auto">
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

              {/* Template preview */}
              <div className="space-y-2">
                <Label>Pratinjau Template</Label>
                <div className="border border-border rounded-lg bg-muted/30 overflow-y-auto max-h-[320px]">
                  {selectedTemplate ? (
                    <TemplatePreview
                      body={selectedTemplate.body ?? ''}
                      channel={selectedTemplate.channel}
                      subject={selectedTemplate.subject}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
                      Pilih template untuk melihat pratinjau
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={handleClose} disabled={isPending} type="button">
            Batal
          </Button>
          <Button
            onClick={form.handleSubmit(onSubmit)}
            disabled={!form.formState.isValid || isPending}
            type="button"
            className="gap-2"
          >
            {isPending
              ? <><Loader2 className="h-4 w-4 animate-spin" />Mengirim…</>
              : scheduleMode === 'now'
                ? <><Send className="h-4 w-4" />Kirim Blast</>
                : <><Send className="h-4 w-4" />Jadwalkan Blast</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
