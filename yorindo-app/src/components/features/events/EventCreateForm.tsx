'use client'

import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Check, ChevronsUpDown, X, Upload, ImageIcon, Loader2 } from 'lucide-react'
import Image from 'next/image'
import { useCreateEvent, useUpdateEvent } from '@/hooks/useEvents'
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
import {
  Card,
  CardContent,
} from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { Event } from '@/types/api'

// ─── Constants ────────────────────────────────────────────────────────────────

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

const ALLOWED_IMAGE_TYPES: ReadonlySet<string> = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
  'image/svg+xml',
])

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB

// ─── Zod Schema ───────────────────────────────────────────────────────────────

const schema = z.object({
  name: z.string().min(1, 'Nama event wajib diisi'),
  description: z.string().optional(),
  eventDateOnly: z.string().min(1, 'Tanggal wajib diisi'),
  eventTime: z.string().min(1, 'Waktu wajib diisi'),
  timezone: z.enum(['Asia/Jakarta', 'Asia/Makassar', 'Asia/Jayapura']),
  capacity: z.string().optional(),
  venue: z.string().optional(),
  eventType: z.string().optional(),
  bannerUrl: z.string().url('URL tidak valid').optional().or(z.literal('')),
  topicTagsRaw: z.string().optional(),
  is_paid: z.boolean().optional(),
  price: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

// ─── Types ────────────────────────────────────────────────────────────────────

interface EventCreateFormProps {
  event?: Event
  onSuccess: () => void
  onCancel: () => void
}

interface BannerUploadProps {
  value: string
  onChange: (url: string) => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function validateImageFile(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    const ext = file.name.split('.').pop()?.toUpperCase() ?? file.type
    return `Format ${ext} tidak didukung. Gunakan JPG, PNG, WebP, GIF, atau AVIF.`
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    const sizeMB = (file.size / 1024 / 1024).toFixed(1)
    return `Ukuran file ${sizeMB}MB melebihi batas 5MB. Kompres gambar terlebih dahulu.`
  }
  return null
}

function validateImageUrl(url: string): string | null {
  try {
    new URL(url)
  } catch {
    return 'Format URL tidak valid. Pastikan diawali dengan https://'
  }
  const hasImageExt = /\.(jpg|jpeg|png|webp|gif|avif|svg)(\?.*)?$/i.test(url)
  if (!hasImageExt) {
    return 'URL harus mengarah ke file gambar (contoh: .jpg, .png, .webp)'
  }
  return null
}

/**
 * MOCK upload — tidak perlu backend.
 * Simulate delay jaringan, lalu return blob URL lokal dari file yang dipilih.
 *
 * Nanti kalau backend sudah siap, ganti isi fungsi ini dengan:
 *   const formData = new FormData()
 *   formData.append('file', file)
 *   const res = await fetch('/api/uploads/image', { method: 'POST', body: formData })
 *   if (!res.ok) throw new Error('Upload gagal')
 *   const data = await res.json()
 *   return data.url
 *
 * CATATAN: blob URL hanya valid selama sesi browser saat ini.
 * Untuk production, backend harus menyimpan file ke storage
 * (Supabase Storage, S3, Cloudinary, dll) dan return URL permanen.
 */
async function mockUploadImage(file: File): Promise<string> {
  await new Promise((resolve) => setTimeout(resolve, 900))
  return URL.createObjectURL(file)
}

// ─── Main Form ────────────────────────────────────────────────────────────────

export function EventCreateForm({ event, onSuccess, onCancel }: EventCreateFormProps) {
  const isEdit = !!event

  const { mutate: createEvent, isPending: isCreating, isError: isCreateError } = useCreateEvent()
  const {
    mutate: updateEvent,
    isPending: isUpdating,
    isError: isUpdateError,
  } = useUpdateEvent(event?.id ?? '')

  const isPending = isEdit ? isUpdating : isCreating
  const isError = isEdit ? isUpdateError : isCreateError

  const { data: vendorsData, isLoading: isLoadingVendors } = useVendors()
  const { data: existingSponsors } = useEventSponsors(event?.id ?? '')

  const [blastTemplateId, setBlastTemplateId] = useState('')
  const [confirmationTemplateId, setConfirmationTemplateId] = useState('')
  const [rejectionTemplateId, setRejectionTemplateId] = useState('')
  const [industryTags, setIndustryTags] = useState<string[]>(event?.industryTags ?? [])

  const [selectedVendorIds, setSelectedVendorIds] = useState<string[]>([])
  const [vendorPopoverOpen, setVendorPopoverOpen] = useState(false)

  // Sync sponsor yang sudah ada (edit mode)
  const sponsorKey =
    isEdit && existingSponsors ? existingSponsors.map((s) => s.vendor_id).sort().join() : null
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
      is_paid: event?.is_paid ?? false,
      price: event?.price ? String(event.price) : '',
      bannerUrl: event?.bannerUrl ?? '',
      capacity: event?.capacity != null ? String(event.capacity) : '',
      venue: event?.venue ?? '',
      eventType: event?.eventType ?? '',
      topicTagsRaw: event?.topicTags?.join(', ') ?? '',
    },
  })

  const isPaidWatched = watch('is_paid')
  const bannerUrlWatched = watch('bannerUrl')


  const loadedRef = useRef<string>('')

  useEffect(() => {
    if (!existingSponsors) return

    const key = existingSponsors.map((s: { vendor_id: string }) => s.vendor_id).sort().join()

    if (key && key !== loadedRef.current) {
      loadedRef.current = key
      setSelectedVendorIds(existingSponsors.map((s: { vendor_id: string }) => s.vendor_id))
    }
  }, [existingSponsors])


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

  // ─── MOCK TEMPLATES (digunakan untuk tampilan card) ────────────────────────
  // Minimal 2 card per kategori sesuai permintaan. Bisa diganti dengan data real nanti.
  const mockInvitationTemplates = [
    {
      id: 'template-inv-1',
      name: 'Undangan Standar',
      description:
        'Template undangan sederhana dengan format teks yang jelas, cocok untuk event umum. Termasuk detail event, lokasi, dan tombol RSVP.',
    },
    {
      id: 'template-inv-2',
      name: 'Undangan Kreatif',
      description:
        'Template undangan dengan desain modern dan elemen visual menarik. Cocok untuk event teknologi atau kreatif.',
    },
  ]

  const mockConfirmationTemplates = [
    {
      id: 'template-conf-1',
      name: 'Konfirmasi Kehadiran',
      description:
        'Template konfirmasi otomatis yang dikirim setelah peserta mendaftar. Berisi terima kasih dan detail tiket/event.',
    },
    {
      id: 'template-conf-2',
      name: 'Konfirmasi VIP',
      description:
        'Template khusus untuk peserta VIP dengan informasi tambahan dan akses eksklusif.',
    },
  ]

  const mockRejectionTemplates = [
    {
      id: 'template-rej-1',
      name: 'Penolakan Standar',
      description:
        'Template penolakan sopan untuk pendaftaran yang tidak disetujui atau kuota penuh.',
    },
    {
      id: 'template-rej-2',
      name: 'Penolakan Alternatif',
      description:
        'Template yang menawarkan alternatif seperti event berikutnya atau waitlist.',
    },
  ]

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
      bannerUrl: values.bannerUrl,
      industryTags,
      is_paid: values.is_paid ?? false,
      price: values.price ? Number(values.price) : 0,
      ...(capacity !== undefined && { capacity }),
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
      <div>
        <Label>Banner Event (URL)</Label>
        <div className="space-y-2">
          <Input
            placeholder="https://example.com/banner.jpg"
            {...register('bannerUrl')}
          />
          <div className="relative aspect-video w-full overflow-hidden rounded-lg border bg-muted flex items-center justify-center">
            {bannerUrlWatched ? (
              <Image
                src={bannerUrlWatched}
                alt="Preview Banner"
                fill
                unoptimized
                className="object-cover"
                onError={() => {
                  // Fallback to placeholder if image fails to load
                }}
              />
            ) : (

              <div className="flex flex-col items-center text-muted-foreground">
                <ImageIcon className="h-8 w-8 mb-1" />
                <span className="text-xs">Pratinjau Banner (16:9)</span>
              </div>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground">
            Masukkan URL gambar. Rekomendasi rasio 16:9.
          </p>
          {errors.bannerUrl && <p className="text-red-500 text-sm">{errors.bannerUrl.message}</p>}
        </div>

      </div>

      {/* Nama Event */}
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
        {errors.name && (
          <p className="mt-1 text-xs text-destructive" role="alert">
            {errors.name.message}
          </p>
        )}
      </div>

      {/* Deskripsi */}
      <div>
        <Label htmlFor="description">Deskripsi</Label>
        <Textarea
          id="description"
          {...register('description')}
          rows={3}
          placeholder="Deskripsi singkat event..."
        />
      </div>

      {/* Tanggal, Waktu, Zona Waktu */}
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
          {errors.eventDateOnly && (
            <p className="mt-1 text-xs text-destructive" role="alert">
              {errors.eventDateOnly.message}
            </p>
          )}
        </div>
        <div>
          <Label htmlFor="eventTime">
            Waktu <span className="text-destructive">*</span>
          </Label>
          <Input
            id="eventTime"
            type="time"
            step="60"
            {...register('eventTime')}
            aria-invalid={!!errors.eventTime}
          />
          {errors.eventTime && (
            <p className="mt-1 text-xs text-destructive" role="alert">
              {errors.eventTime.message}
            </p>
          )}
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

      {/* Venue & Kapasitas */}
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

      {/* Tipe Event */}
      <div>
        <Label htmlFor="eventType">Tipe Event</Label>
        <select id="eventType" {...register('eventType')} className={selectClassName}>
          <option value="">— Pilih tipe —</option>
          {EVENT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {/* Industri */}
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
                aria-pressed={selected}
                className={cn(
                  'inline-flex items-center rounded-full border px-3 py-0.5 text-xs font-medium transition-colors',
                  selected
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:bg-muted'
                )}
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
                            <span className="ml-2 text-xs text-muted-foreground">
                              {vendor.industry}
                            </span>
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

      {/* Templates → Diubah menjadi CARD (minimal 2 card per kategori) */}

      <fieldset className="space-y-6 border border-border rounded-lg p-4">
        <legend className="text-sm font-medium text-foreground px-1">Template (Opsional)</legend>

        {/* Template Undangan */}
        <div>
          <Label className="mb-3 block">Template Undangan</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {mockInvitationTemplates.map((template) => {
              const isSelected = blastTemplateId === template.id
              const handleSelect = () => {
                setBlastTemplateId(template.id)
                toast.success(`Template Undangan dipilih: ${template.name}`)
              }

              return (
                <Popover key={template.id}>
                  <PopoverTrigger asChild>
                    <Card
                      className={cn(
                        'cursor-pointer transition-all hover:shadow-md active:scale-[0.98]',
                        isSelected && 'border-primary bg-primary/5 ring-1 ring-primary/30'
                      )}
                    >
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-semibold text-base">{template.name}</h4>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              Klik untuk lihat deskripsi lengkap
                            </p>
                          </div>
                          {isSelected && <Check className="h-5 w-5 text-primary mt-0.5" />}
                        </div>
                      </CardContent>
                    </Card>
                  </PopoverTrigger>
                  <PopoverContent side="bottom" align="start" className="w-80 p-5">
                    <div className="space-y-4">
                      <h4 className="font-semibold text-lg">{template.name}</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {template.description}
                      </p>
                      <Button type="button" onClick={handleSelect} className="w-full">
                        Pilih Template Ini
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              )
            })}
          </div>
        </div>

        {/* Template Konfirmasi (Penerimaan) */}
        <div>
          <Label className="mb-3 block">Template Konfirmasi</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {mockConfirmationTemplates.map((template) => {
              const isSelected = confirmationTemplateId === template.id
              const handleSelect = () => {
                setConfirmationTemplateId(template.id)
                toast.success(`Template Konfirmasi dipilih: ${template.name}`)
              }

              return (
                <Popover key={template.id}>
                  <PopoverTrigger asChild>
                    <Card
                      className={cn(
                        'cursor-pointer transition-all hover:shadow-md active:scale-[0.98]',
                        isSelected && 'border-primary bg-primary/5 ring-1 ring-primary/30'
                      )}
                    >
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-semibold text-base">{template.name}</h4>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              Klik untuk lihat deskripsi lengkap
                            </p>
                          </div>
                          {isSelected && <Check className="h-5 w-5 text-primary mt-0.5" />}
                        </div>
                      </CardContent>
                    </Card>
                  </PopoverTrigger>
                  <PopoverContent side="bottom" align="start" className="w-80 p-5">
                    <div className="space-y-4">
                      <h4 className="font-semibold text-lg">{template.name}</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {template.description}
                      </p>
                      <Button type="button" onClick={handleSelect} className="w-full">
                        Pilih Template Ini
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              )
            })}
          </div>
        </div>

        {/* Template Penolakan */}
        <div>
          <Label className="mb-3 block">Template Penolakan</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {mockRejectionTemplates.map((template) => {
              const isSelected = rejectionTemplateId === template.id
              const handleSelect = () => {
                setRejectionTemplateId(template.id)
                toast.success(`Template Penolakan dipilih: ${template.name}`)
              }

              return (
                <Popover key={template.id}>
                  <PopoverTrigger asChild>
                    <Card
                      className={cn(
                        'cursor-pointer transition-all hover:shadow-md active:scale-[0.98]',
                        isSelected && 'border-primary bg-primary/5 ring-1 ring-primary/30'
                      )}
                    >
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-semibold text-base">{template.name}</h4>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              Klik untuk lihat deskripsi lengkap
                            </p>
                          </div>
                          {isSelected && <Check className="h-5 w-5 text-primary mt-0.5" />}
                        </div>
                      </CardContent>
                    </Card>
                  </PopoverTrigger>
                  <PopoverContent side="bottom" align="start" className="w-80 p-5">
                    <div className="space-y-4">
                      <h4 className="font-semibold text-lg">{template.name}</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {template.description}
                      </p>
                      <Button type="button" onClick={handleSelect} className="w-full">
                        Pilih Template Ini
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              )
            })}
          </div>
        </div>
      </fieldset>

      {/* Error global */}
      {isError && (
        <p className="text-sm text-destructive" role="alert">
          {isEdit ? 'Gagal menyimpan perubahan.' : 'Gagal membuat event.'} Silakan coba lagi.
        </p>
      )}

      {/* Action buttons — di mobile full width, di desktop auto */}
      <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} className="w-full sm:w-auto">
          Tutup
        </Button>
        <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Menyimpan...
            </>
          ) : isEdit ? (
            'Simpan Perubahan'
          ) : (
            'Buat Event'
          )}
        </Button>
      </div>
    </form>
  )
}