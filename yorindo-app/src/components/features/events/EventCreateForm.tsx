'use client'

import { useState, useMemo, useRef, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Check, ChevronsUpDown, X, Upload, ImageIcon, Loader2 } from 'lucide-react'
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
import { toast } from 'sonner'
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
  is_paid: z.boolean().optional(),
  price: z.string().optional(),
  payment_method: z.string().optional(),
}).refine(
  (data) => !data.is_paid || (data.price !== undefined && data.price !== '' && Number(data.price) >= 0),
  { message: "Harga wajib diisi dan minimal 0", path: ["price"] }
)

type FormValues = z.infer<typeof schema>


interface EventCreateFormProps {
  event?: Event
  onSuccess: () => void
  onCancel: () => void
}

// ─── Banner Upload Component ──────────────────────────────────────────────────
interface BannerUploadProps {
  value: string
  onChange: (url: string) => void
}

function BannerUpload({ value, onChange }: BannerUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [urlMode, setUrlMode] = useState(!!(value && value.startsWith('http')))
  const [urlInput, setUrlInput] = useState(value.startsWith('http') ? value : '')

  const handleFile = useCallback(async (file: File) => {
    // Validasi tipe
    if (!file.type.startsWith('image/')) {
      toast.error('File harus berupa gambar (JPG, PNG, WebP, dll)')
      return
    }
    // Validasi ukuran maks 5MB
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Ukuran gambar maksimal 5MB')
      return
    }

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/uploads/image', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error?.message ?? 'Upload gagal')
      }

      const data = await res.json()
      // API harus return { url: "https://..." }
      onChange(data.url)
      toast.success('Gambar berhasil diupload')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload gagal')
    } finally {
      setIsUploading(false)
    }
  }, [onChange])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const handleUrlApply = () => {
    const trimmed = urlInput.trim()
    if (!trimmed) return
    try {
      new URL(trimmed)
      onChange(trimmed)
    } catch {
      toast.error('URL tidak valid')
    }
  }

  const clearBanner = () => {
    onChange('')
    setUrlInput('')
    if (inputRef.current) inputRef.current.value = ''
  }

  // Sudah ada gambar — tampilkan preview
  if (value) {
    return (
      <div className="space-y-2">
        <div className="relative rounded-lg overflow-hidden border border-border bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="Banner preview"
            className="w-full h-40 object-cover"
            onError={(e) => {
              ;(e.target as HTMLImageElement).style.display = 'none'
            }}
          />
          <button
            type="button"
            onClick={clearBanner}
            className="absolute top-2 right-2 rounded-full bg-black/60 hover:bg-black/80 text-white p-1 transition-colors"
            aria-label="Hapus banner"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        <p className="text-xs text-muted-foreground truncate">{value}</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Mode toggle */}
      <div className="flex gap-3 text-xs">
        <button
          type="button"
          onClick={() => setUrlMode(false)}
          className={`font-medium ${!urlMode ? 'text-primary underline underline-offset-2' : 'text-muted-foreground hover:text-foreground'}`}
        >
          Upload File
        </button>
        <button
          type="button"
          onClick={() => setUrlMode(true)}
          className={`font-medium ${urlMode ? 'text-primary underline underline-offset-2' : 'text-muted-foreground hover:text-foreground'}`}
        >
          Pakai URL
        </button>
      </div>

      {urlMode ? (
        // ── Mode URL ────────────────────────────────────────────────────────
        <div className="flex gap-2">
          <Input
            type="url"
            placeholder="https://example.com/banner.jpg"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleUrlApply())}
            className="flex-1"
          />
          <Button type="button" variant="outline" size="sm" onClick={handleUrlApply}>
            Terapkan
          </Button>
        </div>
      ) : (
        // ── Mode Upload File ─────────────────────────────────────────────────
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => !isUploading && inputRef.current?.click()}
          className={cn(
            'relative flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-8 text-center cursor-pointer transition-colors',
            isDragging
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/50 hover:bg-muted/40',
            isUploading && 'pointer-events-none opacity-70'
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleFile(file)
            }}
          />

          {isUploading ? (
            <>
              <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
              <p className="text-sm text-muted-foreground">Mengupload...</p>
            </>
          ) : (
            <>
              {isDragging ? (
                <ImageIcon className="w-8 h-8 text-primary" />
              ) : (
                <Upload className="w-8 h-8 text-muted-foreground" />
              )}
              <div>
                <p className="text-sm font-medium">
                  {isDragging ? 'Lepas untuk upload' : 'Drag & drop atau klik untuk pilih'}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  JPG, PNG, WebP — maks 5MB
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main Form ────────────────────────────────────────────────────────────────
export function EventCreateForm({ event, onSuccess, onCancel }: EventCreateFormProps) {
  const isEdit = !!event
  const { mutate: createEvent, isPending: isCreating, isError: isCreateError } = useCreateEvent()
  const { mutate: updateEvent, isPending: isUpdating, isError: isUpdateError } = useUpdateEvent(event?.id ?? '')

  const isPending = isEdit ? isUpdating : isCreating
  const isError = isEdit ? isUpdateError : isCreateError

  const { data: templates = [], isLoading: isLoadingTemplates } = useTemplates()
  const { data: vendorsData, isLoading: isLoadingVendors } = useVendors()
  const { data: existingSponsors } = useEventSponsors(event?.id ?? '')

  const [bannerUrl, setBannerUrl] = useState(event?.bannerUrl ?? '')
  const [blastTemplateId, setBlastTemplateId] = useState('')
  const [confirmationTemplateId, setConfirmationTemplateId] = useState('')
  const [rejectionTemplateId, setRejectionTemplateId] = useState('')
  const [industryTags, setIndustryTags] = useState<string[]>(event?.industryTags ?? [])
  const [selectedVendorIds, setSelectedVendorIds] = useState<string[]>([])
  const [vendorPopoverOpen, setVendorPopoverOpen] = useState(false)

  const sponsorKey = isEdit && existingSponsors ? existingSponsors.map((s) => s.vendor_id).sort().join() : null
  const [loadedSponsorKey, setLoadedSponsorKey] = useState<string | null>(null)
  if (sponsorKey !== null && sponsorKey !== loadedSponsorKey) {
    setLoadedSponsorKey(sponsorKey)
    setSelectedVendorIds(existingSponsors!.map((s) => s.vendor_id))
  }

  const {
    register,
    handleSubmit,
    watch,
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
      is_paid: event?.is_paid ?? false,
      price: event?.price != null ? String(event.price) : '',
      payment_method: event?.payment_method ?? '',
    },
  })

  const isPaidWatched = watch('is_paid')

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
      is_paid: !!values.is_paid,
      price: values.is_paid && values.price ? parseInt(values.price, 10) : 0,
      payment_method: values.is_paid && values.payment_method ? values.payment_method : null,
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

      {/* Payment Configuration (AC7) */}
      <fieldset className="space-y-3 border border-border rounded-lg p-4">
        <legend className="text-sm font-medium text-foreground px-1">Konfigurasi Berbayar (Admin Only)</legend>
        <div className="flex items-center space-x-2">
          <input
            id="is_paid"
            type="checkbox"
            {...register('is_paid')}
            className="h-4 w-4 rounded border-primary text-primary focus:ring-primary"
          />
          <Label htmlFor="is_paid" className="cursor-pointer">
            Event Berbayar
          </Label>
        </div>
        
        {isPaidWatched && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
            <div>
              <Label htmlFor="price">
                Harga <span className="text-destructive">*</span>
              </Label>
              <Input
                id="price"
                type="number"
                min={0}
                {...register('price')}
                placeholder="Contoh: 150000"
                aria-invalid={!!errors.price}
              />
              {errors.price && <p className="mt-1 text-xs text-destructive">{errors.price.message}</p>}
            </div>
            <div>
              <Label htmlFor="payment_method">Metode Pembayaran</Label>
              <Input
                id="payment_method"
                type="text"
                {...register('payment_method')}
                placeholder="e.g. Transfer Bank"
              />
            </div>
          </div>
        )}
      </fieldset>

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

      {/* ── Banner / Image Upload (BARU) ───────────────────────────────── */}
      <div>
        <Label>Banner Event (Opsional)</Label>
        <div className="mt-1.5">
          <BannerUpload value={bannerUrl} onChange={setBannerUrl} />
        </div>
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

      <div className="flex justify-between items-center pt-2">
        <Button 
          type="button" 
          variant="secondary" 
          onClick={() => alert('FormPreviewModal will be opened here (Requires Story 4-4)')}
        >
          Preview Formulir
        </Button>
        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={onCancel}>
            Tutup
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Buat Event'}
          </Button>
        </div>
      </div>
    </form>
  )
}