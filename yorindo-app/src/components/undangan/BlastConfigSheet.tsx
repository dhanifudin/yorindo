'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Input } from '@/components/ui/input'
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
import { cn } from '@/lib/utils'
import { Check, ChevronsUpDown } from 'lucide-react'

const blastSchema = z.object({
  templateId: z.string().min(1, 'Pilih template undangan'),
  scheduleMode: z.enum(['now', 'later']),
  scheduledDate: z.string().optional(),
  scheduledTime: z.string().optional(),
})

type BlastFormValues = z.infer<typeof blastSchema>

interface Template {
  id: string
  name: string
  channel: 'whatsapp' | 'email'
  type: string
  body?: string
  subject?: string
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
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [templatePopoverOpen, setTemplatePopoverOpen] = useState(false)

  const form = useForm<BlastFormValues>({
    resolver: zodResolver(blastSchema),
    mode: 'onBlur',
    defaultValues: { scheduleMode: 'now' },
  })

  const scheduleMode = form.watch('scheduleMode')

  // Filter: invitation type + email channel only (WhatsApp disabled)
  const invitationTemplates = templates.filter(
    (t) => t.type === 'invitation' && t.channel === 'email'
  )

  async function onSubmit(values: BlastFormValues) {
    setIsSubmitting(true)
    try {
      const body: Record<string, unknown> = {
        eventId,
        channel: 'email',
        templateId: values.templateId,
      }

      if (values.scheduleMode === 'later' && values.scheduledDate && values.scheduledTime) {
        body.scheduledAt = `${values.scheduledDate}T${values.scheduledTime}:00.000Z`
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
      const data = (await res.json()) as { jobId?: string }
      onOpenChange(false)
      setSelectedTemplate(null)
      form.reset({ scheduleMode: 'now', scheduledDate: undefined, scheduledTime: undefined })
      toast.success('Blast dijadwalkan')
      onSuccess(data.jobId)
    } catch {
      toast.error('Gagal mengirim blast — coba lagi')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setSelectedTemplate(null) }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Kirim Undangan</DialogTitle>
          <DialogDescription>
            Pilih template undangan dan jadwal pengiriman
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          {/* Template selector — invitation + email only (Popover + Command) */}
          <div className="space-y-2">
            <Label>Template Undangan</Label>
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

          {/* Template Preview */}
          {selectedTemplate && (
            <div className="space-y-2">
              <Label>Pratinjau</Label>
              <div className="border border-border rounded-lg p-4 bg-muted/30">
                <TemplatePreview
                  body={selectedTemplate.body ?? ''}
                  channel={selectedTemplate.channel}
                  subject={selectedTemplate.subject}
                />
              </div>
            </div>
          )}

          {/* Schedule mode: Now or Later */}
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

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              type="button"
            >
              Batal
            </Button>
            <Button disabled={isSubmitting} type="submit">
              {isSubmitting
                ? 'Mengirim…'
                : scheduleMode === 'now'
                  ? 'Kirim Sekarang'
                  : 'Jadwalkan Blast'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
