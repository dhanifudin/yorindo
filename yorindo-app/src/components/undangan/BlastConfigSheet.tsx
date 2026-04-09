'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const MAX_CUSTOM_MESSAGE = 1000

const blastSchema = z.object({
  channel: z.enum(['whatsapp', 'email']),
  templateId: z.string().optional(),
  customMessage: z.string().max(MAX_CUSTOM_MESSAGE).optional(),
  scheduledAt: z.string().optional(),       // Computed ISO 8601 UTC from date + time
  scheduledDate: z.string().optional(),      // YYYY-MM-DD
  scheduledTime: z.string().optional(),      // HH:MM (24hr)
}).refine(
  (data) => !!data.templateId || !!data.customMessage?.trim(),
  { message: 'Pilih template atau tulis pesan kustom', path: ['templateId'] }
)

type BlastFormValues = z.infer<typeof blastSchema>

interface Template {
  id: string
  name: string
  channel: 'whatsapp' | 'email'
}

interface BlastConfigSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  eventId: string
  templates: Template[]
  selectedContactIds?: string[]
  onSuccess: (jobId?: string) => void
}

export function BlastConfigSheet({
  open,
  onOpenChange,
  eventId,
  templates,
  selectedContactIds,
  onSuccess,
}: BlastConfigSheetProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<BlastFormValues>({
    resolver: zodResolver(blastSchema),
    mode: 'onBlur',
    defaultValues: { channel: 'whatsapp' },
  })

  const selectedChannel = form.watch('channel')
  const customMessage = form.watch('customMessage') ?? ''
  const filteredTemplates = templates.filter((t) => t.channel === selectedChannel)

  async function onSubmit(values: BlastFormValues) {
    setIsSubmitting(true)
    try {
      const body: Record<string, unknown> = { eventId }
      if (values.channel) body.channel = values.channel
      if (values.templateId) body.templateId = values.templateId
      if (values.customMessage?.trim()) body.customMessage = values.customMessage
      // Only send scheduledAt if both date and time were provided
      if (values.scheduledAt && values.scheduledDate && values.scheduledTime) {
        body.scheduledAt = values.scheduledAt
      }
      if (selectedContactIds && selectedContactIds.length > 0) {
        body.contactIds = selectedContactIds
      }
      const res = await fetch(`/api/events/${eventId}/blast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error('Failed')
      const data = await res.json() as { jobId?: string }
      onOpenChange(false)
      form.reset({ channel: 'whatsapp', scheduledDate: undefined, scheduledTime: undefined, scheduledAt: undefined })
      toast.success('Blast dijadwalkan')
      onSuccess(data.jobId)
    } catch {
      toast.error('Gagal mengirim blast — coba lagi')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Kirim Undangan</SheetTitle>
          <SheetDescription>
            Konfigurasi blast undangan untuk event ini
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 px-4 space-y-4 overflow-y-auto">
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5 flex-1">
            {/* Channel radio */}
            <div className="space-y-2">
              <Label>Saluran</Label>
              <div className="flex gap-3">
                {(['whatsapp', 'email'] as const).map((ch) => (
                  <label key={ch} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value={ch}
                      {...form.register('channel')}
                      className="accent-primary"
                      onChange={() => {
                        form.setValue('channel', ch, { shouldValidate: true })
                        form.setValue('templateId', '')
                      }}
                      checked={selectedChannel === ch}
                    />
                    <span className="text-sm capitalize">{ch === 'whatsapp' ? 'WhatsApp' : 'Email'}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Template selector */}
            <div className="space-y-2">
              <Label htmlFor="templateId">Template</Label>
              <Select
                value={form.watch('templateId') ?? ''}
                onValueChange={(val) => form.setValue('templateId', val, { shouldValidate: true })}
              >
                <SelectTrigger id="templateId">
                  <SelectValue placeholder="Pilih template…" />
                </SelectTrigger>
                <SelectContent>
                  {filteredTemplates.length === 0 ? (
                    <SelectItem value="_none" disabled>Tidak ada template untuk saluran ini</SelectItem>
                  ) : (
                    filteredTemplates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {form.formState.errors.templateId && (
                <p className="text-xs text-destructive">{form.formState.errors.templateId.message}</p>
              )}
            </div>

            {/* Custom message (optional — replaces template) */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">atau tulis pesan kustom</span>
                <div className="flex-1 h-px bg-border" />
              </div>
              <Label htmlFor="customMessage">Pesan Kustom (opsional)</Label>
              <Textarea
                id="customMessage"
                {...form.register('customMessage')}
                rows={4}
                placeholder="Tulis pesan undangan secara langsung tanpa template…"
                onChange={(e) => {
                  if (e.target.value.length <= MAX_CUSTOM_MESSAGE) {
                    form.setValue('customMessage', e.target.value, { shouldValidate: true })
                  }
                }}
              />
              <div className="flex justify-end">
                <p className="text-xs text-muted-foreground">{customMessage.length} / {MAX_CUSTOM_MESSAGE}</p>
              </div>
            </div>

            {/* Optional scheduled date & time */}
            <div className="space-y-2">
              <Label>Jadwalkan (opsional)</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="scheduledDate" className="text-xs text-muted-foreground">Tanggal</Label>
                  <Input
                    id="scheduledDate"
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    {...form.register('scheduledDate')}
                    onChange={(e) => {
                      form.setValue('scheduledDate', e.target.value, { shouldValidate: true })
                      // Recompute scheduledAt from date + time
                      const date = e.target.value
                      const time = form.getValues('scheduledTime') ?? '09:00'
                      if (date) {
                        form.setValue('scheduledAt', `${date}T${time}:00.000Z`, { shouldValidate: true })
                      }
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="scheduledTime" className="text-xs text-muted-foreground">Waktu (24 jam)</Label>
                  <Input
                    id="scheduledTime"
                    type="time"
                    defaultValue="09:00"
                    {...form.register('scheduledTime')}
                    onChange={(e) => {
                      form.setValue('scheduledTime', e.target.value, { shouldValidate: true })
                      // Recompute scheduledAt from date + time
                      const date = form.getValues('scheduledDate')
                      const time = e.target.value
                      if (date) {
                        form.setValue('scheduledAt', `${date}T${time}:00.000Z`, { shouldValidate: true })
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          </form>
        </div>

        <SheetFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            type="button"
          >
            Batal
          </Button>
          <Button
            onClick={form.handleSubmit(onSubmit)}
            disabled={isSubmitting}
            type="button"
          >
            {isSubmitting ? 'Mengirim…' : 'Kirim Blast'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
