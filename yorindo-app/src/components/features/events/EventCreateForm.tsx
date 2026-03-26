'use client'

import { useState, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Check, ChevronsUpDown, X } from 'lucide-react'
import { useCreateEvent, useUpdateEvent } from '@/hooks/useEvents'
import { useTemplates } from '@/hooks/useTemplates'
import { useVendors } from '@/hooks/useVendors'
import { useEventSponsors } from '@/hooks/useEventSponsors'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { cn } from '@/lib/utils'
import type { Event } from '@/types/api'

const INDUSTRIES = [
  { slug: 'teknologi', label: 'Teknologi' },
  { slug: 'kesehatan', label: 'Kesehatan' },
  { slug: 'keuangan', label: 'Keuangan' },
  { slug: 'manufaktur', label: 'Manufaktur' },
  { slug: 'retail', label: 'Retail' },
  { slug: 'properti', label: 'Properti' },
  { slug: 'pendidikan', label: 'Pendidikan' },
  { slug: 'otomotif', label: 'Otomotif' },
  { slug: 'energi', label: 'Energi' },
  { slug: 'telekomunikasi', label: 'Telekomunikasi' },
]

const EVENT_TYPES = [
  { value: 'conference', label: 'Conference' },
  { value: 'workshop', label: 'Workshop' },
  { value: 'networking', label: 'Networking' },
  { value: 'seminar', label: 'Seminar' },
  { value: 'webinar', label: 'Webinar' },
]

const schema = z.object({
  name: z.string().min(1, 'Nama event wajib diisi'),
  description: z.string().optional(),
  eventDateOnly: z.string().min(1, 'Tanggal wajib diisi'),
  eventTime: z.string().min(1, 'Waktu wajib diisi'),
  timezone: z.enum(['Asia/Jakarta', 'Asia/Makassar', 'Asia/Jayapura']),
  capacity: z.string().optional(),
  venue: z.string().optional(),
  eventType: z.string().optional(),
  topicTagsRaw: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface EventCreateFormProps {
  event?: Event  // if provided → edit mode (PUT); if absent → create mode (POST)
  onSuccess: () => void
  onCancel: () => void
}

export function EventCreateForm({ event, onSuccess, onCancel }: EventCreateFormProps) {
  const isEdit = !!event
  const { mutate: createEvent, isPending: isCreating, isError: isCreateError } = useCreateEvent()
  const { mutate: updateEvent, isPending: isUpdating, isError: isUpdateError } = useUpdateEvent(event?.id ?? '')

  const isPending = isEdit ? isUpdating : isCreating
  const isError = isEdit ? isUpdateError : isCreateError

  const { data: templates = [], isLoading: isLoadingTemplates } = useTemplates()
  const { data: vendorsData, isLoading: isLoadingVendors } = useVendors()
  const { data: existingSponsors } = useEventSponsors(event?.id ?? '')

  // Local state
  const [bannerUrl, setBannerUrl] = useState(event?.bannerUrl ?? '')
  const [blastTemplateId, setBlastTemplateId] = useState('')
  const [confirmationTemplateId, setConfirmationTemplateId] = useState('')
  const [rejectionTemplateId, setRejectionTemplateId] = useState('')
  const [industryTags, setIndustryTags] = useState<string[]>(event?.industryTags ?? [])
  const [selectedVendorIds, setSelectedVendorIds] = useState<string[]>([])
  const [vendorPopoverOpen, setVendorPopoverOpen] = useState(false)

  // Pre-populate vendor selection in edit mode once sponsors load (update-state-while-rendering)
  const sponsorKey = isEdit && existingSponsors ? existingSponsors.map((s) => s.vendor_id).sort().join() : null
  const [loadedSponsorKey, setLoadedSponsorKey] = useState<string | null>(null)
  if (sponsorKey !== null && sponsorKey !== loadedSponsorKey) {
    setLoadedSponsorKey(sponsorKey)
    setSelectedVendorIds(existingSponsors!.map((s) => s.vendor_id))
  }

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: event?.name ?? '',
      description: event?.description ?? '',
      eventDateOnly: event?.eventDate ? event.eventDate.slice(0, 10) : '',
      eventTime: event?.eventDate ? event.eventDate.slice(11, 16) : '',
      timezone: event?.timezone ?? 'Asia/Jakarta',
      capacity: event?.capacity != null ? String(event.capacity) : '',
      venue: event?.venue ?? '',
      eventType: event?.eventType ?? '',
      topicTagsRaw: event?.topicTags?.join(', ') ?? '',
    },
  })

  const invitationTemplates = useMemo(() => templates.filter((t) => t.type === 'invitation'), [templates])
  const confirmationTemplates = useMemo(() => templates.filter((t) => t.type === 'confirmation'), [templates])
  const rejectionTemplates = useMemo(() => templates.filter((t) => t.type === 'rejection'), [templates])

  const allVendors = vendorsData?.data ?? []
  const selectedVendors = allVendors.filter((v) => selectedVendorIds.includes(v.id))

  const toggleVendor = (vendorId: string) => {
    setSelectedVendorIds((prev) =>
      prev.includes(vendorId) ? prev.filter((id) => id !== vendorId) : [...prev, vendorId]
    )
  }

  const toggleIndustry = (slug: string) => {
    setIndustryTags((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    )
  }

  const syncVendors = async (eventId: string) => {
    const originalIds = new Set((existingSponsors ?? []).map((s) => s.vendor_id))
    const nextIds = new Set(selectedVendorIds)

    const toAdd = selectedVendorIds.filter((id) => !originalIds.has(id))
    const toRemove = [...originalIds].filter((id) => !nextIds.has(id))

    await Promise.allSettled([
      ...toAdd.map((vendorId) =>
        fetch(`/api/events/${eventId}/sponsors`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vendorId, tier: 'standard' }),
        })
      ),
      ...toRemove.map((vendorId) =>
        fetch(`/api/events/${eventId}/sponsors/${vendorId}`, { method: 'DELETE' })
      ),
    ])
  }

  const onSubmit = (values: FormValues) => {
    const capacity = values.capacity ? parseInt(values.capacity, 10) : undefined
    const topicTags = values.topicTagsRaw
      ? values.topicTagsRaw.split(',').map((t) => t.trim()).filter(Boolean)
      : undefined
    const eventType = (values.eventType || undefined) as Event['eventType'] | undefined

    const body = {
      name: values.name,
      description: values.description,
      eventDate: new Date(`${values.eventDateOnly}T${values.eventTime}`).toISOString(),
      timezone: values.timezone,
      ...(capacity !== undefined && { capacity }),
      ...(bannerUrl && { bannerUrl }),
      ...(values.venue && { venue: values.venue }),
      ...(eventType && { eventType }),
      ...(industryTags.length && { industryTags }),
      ...(topicTags?.length && { topicTags }),
      ...(blastTemplateId && { blastTemplateId }),
      ...(confirmationTemplateId && { confirmationTemplateId }),
      ...(rejectionTemplateId && { rejectionTemplateId }),
    }

    if (isEdit) {
      updateEvent(body, {
        onSuccess: async () => {
          await syncVendors(event!.id)
          onSuccess()
        },
      })
    } else {
      createEvent(body, {
        onSuccess: async (created) => {
          await syncVendors(created.id)
          onSuccess()
        },
      })
    }
  }

  const selectClassName =
    'h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50'

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      {/* Name */}
      <div>
        <Label htmlFor="name">
          Nama Event <span className="text-destructive">*</span>
        </Label>
        <Input
          id="name"
          type="text"
          {...register('name')}
          placeholder="Contoh: Seminar ERP Jakarta"
          aria-invalid={!!errors.name}
        />
        {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>}
      </div>

      {/* Description */}
      <div>
        <Label htmlFor="description">Deskripsi</Label>
        <Textarea
          id="description"
          {...register('description')}
          rows={3}
          placeholder="Deskripsi singkat event..."
        />
      </div>

      {/* Date, Time & Timezone */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <Label htmlFor="eventDateOnly">
            Tanggal <span className="text-destructive">*</span>
          </Label>
          <Input
            id="eventDateOnly"
            type="date"
            {...register('eventDateOnly')}
            aria-invalid={!!errors.eventDateOnly}
          />
          {errors.eventDateOnly && <p className="mt-1 text-xs text-destructive">{errors.eventDateOnly.message}</p>}
        </div>
        <div>
          <Label htmlFor="eventTime">
            Waktu (HH:MM) <span className="text-destructive">*</span>
          </Label>
          <Input
            id="eventTime"
            type="time"
            step="60"
            {...register('eventTime')}
            aria-invalid={!!errors.eventTime}
          />
          {errors.eventTime && <p className="mt-1 text-xs text-destructive">{errors.eventTime.message}</p>}
        </div>
        <div>
          <Label htmlFor="timezone">Zona Waktu</Label>
          <select id="timezone" {...register('timezone')} className={selectClassName}>
            <option value="Asia/Jakarta">WIB (Asia/Jakarta)</option>
            <option value="Asia/Makassar">WITA (Asia/Makassar)</option>
            <option value="Asia/Jayapura">WIT (Asia/Jayapura)</option>
          </select>
        </div>
      </div>

      {/* Venue & Capacity */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label htmlFor="venue">Venue</Label>
          <Input
            id="venue"
            type="text"
            {...register('venue')}
            placeholder="Contoh: Jakarta Convention Center"
          />
        </div>
        <div>
          <Label htmlFor="capacity">Kapasitas</Label>
          <Input
            id="capacity"
            type="number"
            min={1}
            {...register('capacity')}
            placeholder="Contoh: 100"
          />
        </div>
      </div>

      {/* Event Type */}
      <div>
        <Label htmlFor="eventType">Tipe Event</Label>
        <select id="eventType" {...register('eventType')} className={selectClassName}>
          <option value="">— Pilih tipe —</option>
          {EVENT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      {/* Industry Tags */}
      <div>
        <Label>Industri</Label>
        <div className="mt-1.5 flex flex-wrap gap-2">
          {INDUSTRIES.map((ind) => {
            const selected = industryTags.includes(ind.slug)
            return (
              <button
                key={ind.slug}
                type="button"
                onClick={() => toggleIndustry(ind.slug)}
                className={`inline-flex items-center rounded-full border px-3 py-0.5 text-xs font-medium transition-colors ${
                  selected
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:bg-muted'
                }`}
              >
                {ind.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Topic Tags */}
      <div>
        <Label htmlFor="topicTagsRaw">Topic Tags</Label>
        <Input
          id="topicTagsRaw"
          type="text"
          {...register('topicTagsRaw')}
          placeholder="Contoh: fintech, digital-banking, ai"
        />
        <p className="mt-1 text-xs text-muted-foreground">Pisahkan dengan koma</p>
      </div>

      {/* Vendor */}
      <div>
        <Label>Vendor (Opsional)</Label>
        <div className="mt-1.5 space-y-2">
          <Popover open={vendorPopoverOpen} onOpenChange={setVendorPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                role="combobox"
                aria-expanded={vendorPopoverOpen}
                disabled={isLoadingVendors}
                className="w-full justify-between font-normal"
              >
                <span className="text-muted-foreground">
                  {isLoadingVendors
                    ? 'Memuat vendor...'
                    : selectedVendors.length > 0
                    ? `${selectedVendors.length} vendor dipilih`
                    : 'Cari dan pilih vendor...'}
                </span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0" align="start">
              <Command>
                <CommandInput placeholder="Cari vendor..." />
                <CommandList>
                  <CommandEmpty>
                    {allVendors.length === 0
                      ? 'Belum ada vendor terdaftar.'
                      : 'Vendor tidak ditemukan.'}
                  </CommandEmpty>
                  <CommandGroup>
                    {allVendors.map((vendor) => {
                      const isSelected = selectedVendorIds.includes(vendor.id)
                      return (
                        <CommandItem
                          key={vendor.id}
                          value={vendor.name}
                          onSelect={() => toggleVendor(vendor.id)}
                        >
                          <Check
                            className={cn(
                              'mr-2 h-4 w-4',
                              isSelected ? 'opacity-100' : 'opacity-0'
                            )}
                          />
                          <span className="flex-1">{vendor.name}</span>
                          {vendor.industry && (
                            <span className="ml-2 text-xs text-muted-foreground">{vendor.industry}</span>
                          )}
                        </CommandItem>
                      )
                    })}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {/* Selected vendor chips */}
          {selectedVendors.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {selectedVendors.map((vendor) => (
                <Badge key={vendor.id} variant="secondary" className="gap-1 pr-1">
                  {vendor.name}
                  <button
                    type="button"
                    onClick={() => toggleVendor(vendor.id)}
                    className="ml-1 rounded-full hover:bg-muted-foreground/20 p-0.5"
                    aria-label={`Hapus ${vendor.name}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground">Tier dapat diubah setelah event dibuat</p>
        </div>
      </div>

      {/* Banner URL */}
      <div>
        <Label htmlFor="bannerUrl">Banner URL (Opsional)</Label>
        <Input
          id="bannerUrl"
          type="url"
          value={bannerUrl}
          onChange={(e) => setBannerUrl(e.target.value)}
          placeholder="https://example.com/banner.jpg"
        />
        {bannerUrl && (
          <div className="mt-2 rounded-md overflow-hidden border border-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={bannerUrl}
              alt="Banner preview"
              className="w-full h-32 object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          </div>
        )}
      </div>

      {/* Templates */}
      <fieldset className="space-y-3 border border-border rounded-lg p-4">
        <legend className="text-sm font-medium text-foreground px-1">Template (Opsional)</legend>
        <div>
          <Label htmlFor="blastTemplateId">Template Undangan</Label>
          <select
            id="blastTemplateId"
            value={blastTemplateId}
            onChange={(e) => setBlastTemplateId(e.target.value)}
            disabled={isLoadingTemplates}
            className={selectClassName}
          >
            <option value="">— Tidak dipilih —</option>
            {invitationTemplates.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="confirmationTemplateId">Template Konfirmasi</Label>
          <select
            id="confirmationTemplateId"
            value={confirmationTemplateId}
            onChange={(e) => setConfirmationTemplateId(e.target.value)}
            disabled={isLoadingTemplates}
            className={selectClassName}
          >
            <option value="">— Tidak dipilih —</option>
            {confirmationTemplates.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="rejectionTemplateId">Template Penolakan</Label>
          <select
            id="rejectionTemplateId"
            value={rejectionTemplateId}
            onChange={(e) => setRejectionTemplateId(e.target.value)}
            disabled={isLoadingTemplates}
            className={selectClassName}
          >
            <option value="">— Tidak dipilih —</option>
            {rejectionTemplates.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
      </fieldset>

      {isError && (
        <p className="text-sm text-destructive">
          {isEdit ? 'Gagal menyimpan perubahan.' : 'Gagal membuat event.'} Silakan coba lagi.
        </p>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Tutup
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Buat Event'}
        </Button>
      </div>
    </form>
  )
}
