'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Check, ChevronsUpDown, X, Upload, ImageIcon, Loader2, Database } from 'lucide-react'
import { useCreateEvent, useUpdateEvent } from '@/hooks/useEvents'
import { useVendors } from '@/hooks/useVendors'
import { useEventSponsors } from '@/hooks/useEventSponsors'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Link } from 'lucide-react'
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

// ─── Mock Existing Images (Simulasi database admin sebelumnya) ─────────────────
const MOCK_EXISTING_IMAGES = [
  {
    id: 'img-1',
    name: 'Tech Summit 2024',
    url: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=250&fit=crop',
    uploadedBy: 'Admin Budi',
    uploadedAt: '2024-01-15',
  },
  {
    id: 'img-2',
    name: 'Business Conference',
    url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400&h=250&fit=crop',
    uploadedBy: 'Admin Siti',
    uploadedAt: '2024-01-20',
  },
  {
    id: 'img-3',
    name: 'Workshop Series 2024',
    url: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=250&fit=crop',
    uploadedBy: 'Admin Budi',
    uploadedAt: '2024-02-01',
  },
  {
    id: 'img-4',
    name: 'Networking Event',
    url: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=250&fit=crop',
    uploadedBy: 'Admin Rini',
    uploadedAt: '2024-02-10',
  },
  {
    id: 'img-5',
    name: 'Corporate Meeting',
    url: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=250&fit=crop',
    uploadedBy: 'Admin Budi',
    uploadedAt: '2024-02-15',
  },
  {
    id: 'img-6',
    name: 'Seminar Digital',
    url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400&h=250&fit=crop',
    uploadedBy: 'Admin Siti',
    uploadedAt: '2024-02-20',
  },
]

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
  topicTagsRaw: z.string().optional(),
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
 */
async function mockUploadImage(file: File): Promise<string> {
  await new Promise((resolve) => setTimeout(resolve, 900))
  return URL.createObjectURL(file)
}

// ─── ImageSourceSelector Component (Modal untuk memilih sumber gambar) ────────


// ─── ImageSourceSelector Component ────────────────────────────────────────────
interface ImageSourceSelectorProps {
  isOpen: boolean
  onClose: () => void
  onSelectExisting: (imageUrl: string) => void
  onSelectDevice: () => void
  urlInput: string
  setUrlInput: (url: string) => void
  onUrlApply: () => void
}

function ImageSourceSelector({
  isOpen,
  onClose,
  onSelectExisting,
  onSelectDevice,
  urlInput,
  setUrlInput,
  onUrlApply,
}: ImageSourceSelectorProps) {
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'device' | 'gallery' | 'url'>('device')

  const handleSelectImage = (imageUrl: string) => {
    onSelectExisting(imageUrl)
    setSelectedImageId(null)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-lg">
        {/* Header */}
        <div className="border-b border-border px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Pilih Banner Event</h2>
            <p className="text-xs text-muted-foreground mt-1">Pilih sumber gambar untuk banner</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-muted rounded-md transition-colors"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-border px-6 pt-4">
          <div className="flex gap-2 overflow-x-auto pb-2">
            <button
              type="button"
              onClick={() => setActiveTab('device')}
              className={cn(
                'px-5 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                activeTab === 'device'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              <Upload className="w-4 h-4 inline mr-2" />
              Dari Device
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('gallery')}
              className={cn(
                'px-5 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                activeTab === 'gallery'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              <Database className="w-4 h-4 inline mr-2" />
              Database Gallery ({MOCK_EXISTING_IMAGES.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('url')}
              className={cn(
                'px-5 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                activeTab === 'url'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              <Link className="w-4 h-4 inline mr-2" />
              Masukkan URL
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'device' ? (
            // Tab Device
            <div className="flex items-center justify-center py-16">
              <div className="text-center max-w-md">
                <div className="flex justify-center mb-6">
                  <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                    <Upload className="w-10 h-10 text-primary" />
                  </div>
                </div>
                <h3 className="font-semibold text-xl mb-3">Upload dari Device</h3>
                <p className="text-muted-foreground mb-8">
                  Pilih gambar dari komputer atau ponsel Anda.<br />
                  Format: JPG, PNG, WebP, GIF, AVIF (maks 5MB)
                </p>
                <Button type="button" onClick={onSelectDevice} className="w-full">
                  Pilih File Gambar
                </Button>
              </div>
            </div>
          ) : activeTab === 'gallery' ? (
            // Tab Gallery (sama seperti sebelumnya)
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Database className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-base">Galeri Database</h3>
                <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">
                  {MOCK_EXISTING_IMAGES.length} gambar
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {MOCK_EXISTING_IMAGES.map((img) => (
                  <div
                    key={img.id}
                    onClick={() => {
                      setSelectedImageId(img.id)
                      handleSelectImage(img.url)
                    }}
                    className={cn(
                      'group relative rounded-lg overflow-hidden border-2 cursor-pointer transition-all',
                      selectedImageId === img.id
                        ? 'border-primary ring-2 ring-primary/30'
                        : 'border-border hover:border-primary/50'
                    )}
                  >
                    <div className="relative w-full h-40 bg-muted overflow-hidden">
                      <img
                        src={img.url}
                        alt={img.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                        onError={(e) => {
                          ;(e.target as HTMLImageElement).style.opacity = '0.2'
                        }}
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center">
                          <Check className="w-6 h-6" />
                        </div>
                      </div>
                      <div className="absolute top-2 right-2 px-2 py-1 bg-black/60 text-white text-xs rounded">
                        {img.uploadedBy}
                      </div>
                    </div>
                    <div className="p-3 bg-card">
                      <h4 className="font-medium text-sm line-clamp-2">{img.name}</h4>
                      <span className="text-xs text-muted-foreground">{img.uploadedAt}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            // Tab URL
            <div className="max-w-lg mx-auto py-10">
              <Label htmlFor="banner-url" className="text-base">Masukkan URL Gambar</Label>
              <Input
                id="banner-url"
                type="url"
                placeholder="https://example.com/banner.jpg"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                className="mt-3"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    onUrlApply()
                  }
                }}
              />
              <p className="text-xs text-muted-foreground mt-2">
                Pastikan URL valid dan mengarah langsung ke file gambar (jpg, png, webp, dll)
              </p>

              <Button onClick={onUrlApply} className="w-full mt-8" size="lg">
                Terapkan URL sebagai Banner
              </Button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border px-6 py-4 flex justify-end">
          <Button type="button" variant="outline" onClick={onClose}>
            Batal
          </Button>
        </div>
      </Card>
    </div>
  )
}

// ─── BannerUpload Component ───────────────────────────────────────────────────

// ─── BannerUpload Component ───────────────────────────────────────────────────
// ─── BannerUpload Component (WAJIB) ───────────────────────────────────────────
function BannerUpload({ value, onChange }: BannerUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [showSourceModal, setShowSourceModal] = useState(false)
  const [urlInput, setUrlInput] = useState('')

  // Sync existing banner (edit mode)
  useEffect(() => {
    if (value?.startsWith('http') && !value.startsWith('blob:')) {
      setUrlInput(value)
    }
  }, [value])

  // ── Upload file handler ─────────────────────────────────────────────────────
  const handleFile = useCallback(
    async (file: File) => {
      const validationError = validateImageFile(file)
      if (validationError) {
        toast.error(validationError)
        return
      }

      setIsUploading(true)
      try {
        const url = await mockUploadImage(file)
        onChange(url)
        toast.success('Gambar berhasil diupload')
      } catch (err) {
        toast.error('Upload gagal, silakan coba lagi')
      } finally {
        setIsUploading(false)
      }
    },
    [onChange]
  )

  // ── Drag & Drop ─────────────────────────────────────────────────────────────
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false)
    }
  }

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile]
  )

  const handleAreaClick = () => setShowSourceModal(true)

  const handleSelectFromDevice = () => {
    setShowSourceModal(false)
    inputRef.current?.click()
  }

  const handleSelectFromDatabase = (imageUrl: string) => {
    onChange(imageUrl)
    toast.success('Gambar dari database berhasil dipilih')
    setShowSourceModal(false)
  }

  const handleUrlApply = () => {
    const trimmed = urlInput.trim()
    if (!trimmed) {
      toast.error('URL tidak boleh kosong')
      return
    }
    const urlError = validateImageUrl(trimmed)
    if (urlError) {
      toast.error(urlError)
      return
    }
    onChange(trimmed)
    toast.success('Banner URL berhasil diterapkan')
    setShowSourceModal(false)
    setUrlInput('')
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    handleFile(file)
  }

  const clearBanner = () => {
    if (value?.startsWith('blob:')) {
      URL.revokeObjectURL(value)
    }
    onChange('')
    setUrlInput('')
    if (inputRef.current) inputRef.current.value = ''
  }

  // Preview jika sudah ada banner
  if (value) {
    return (
      <div className="space-y-2">
        <div className="relative rounded-lg overflow-hidden border border-border bg-muted">
          <img
            src={value}
            alt="Banner preview"
            className="w-full h-40 object-cover"
            onError={(e) => {
              ;(e.target as HTMLImageElement).style.opacity = '0.3'
            }}
          />
          <button
            type="button"
            onClick={clearBanner}
            className="absolute top-2 right-2 rounded-full bg-black/70 hover:bg-black text-white p-1.5 transition-colors"
            aria-label="Hapus banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={clearBanner}
          className="w-full sm:w-auto"
        >
          Ganti Banner
        </Button>
      </div>
    )
  }

  // Drag & Drop Area - Wajib (dengan indikasi required)
  return (
    <>
      <ImageSourceSelector
        isOpen={showSourceModal}
        onClose={() => setShowSourceModal(false)}
        onSelectExisting={handleSelectFromDatabase}
        onSelectDevice={handleSelectFromDevice}
        urlInput={urlInput}
        setUrlInput={setUrlInput}
        onUrlApply={handleUrlApply}
      />

      <div
        onClick={handleAreaClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'border-2 border-dashed rounded-2xl p-12 text-center transition-all cursor-pointer hover:border-primary/60 active:scale-[0.985]',
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-border hover:bg-muted/50'
        )}
      >
        <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
          <Upload className="w-8 h-8 text-primary" />
        </div>

        <h3 className="font-semibold text-2xl mb-2 flex items-center justify-center gap-2">
          Banner Event <span className="text-destructive text-xl">*</span>
        </h3>
        <p className="text-muted-foreground mb-8 max-w-md mx-auto">
          Wajib diisi. Klik area ini untuk memilih dari device, database, atau masukkan URL gambar
        </p>

        <Button
          type="button"
          variant="secondary"
          size="lg"
          onClick={(e) => {
            e.stopPropagation()
            setShowSourceModal(true)
          }}
        >
          Pilih Banner
        </Button>

        <p className="text-xs text-muted-foreground mt-8">
          JPG • PNG • WebP • GIF • AVIF • Maks 5MB
        </p>
      </div>

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp,image/gif,image/avif,image/svg+xml"
        className="hidden"
        onChange={handleFileInputChange}
      />
    </>
  )
}
// ─── Main Form (Updated with better BannerUpload integration) ────────────────

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

  const [bannerUrl, setBannerUrl] = useState(event?.bannerUrl ?? '')
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

  // Sync selected vendors when editing an event with existing sponsors
  // This is a legitimate use of useEffect: syncing external prop state to local form state
  const loadedRef = useRef<string>('')

  /* eslint-disable react-hooks/set-state-in-effect -- Legitimate: sync form state with existing sponsors when editing event */
  useEffect(() => {
    if (!existingSponsors) return

    const key = existingSponsors.map((s: { vendor_id: string }) => s.vendor_id).sort().join()

    if (key && key !== loadedRef.current) {
      loadedRef.current = key
      setSelectedVendorIds(existingSponsors.map((s: { vendor_id: string }) => s.vendor_id))
    }
  }, [existingSponsors])
  /* eslint-enable react-hooks/set-state-in-effect */


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

  // ─── MOCK TEMPLATES ────────────────────────────────────────────────────────
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

      {/* Banner Upload */}
      <div>
        <Label>Banner Event (Opsional)</Label>
        <div className="mt-1.5">
          <BannerUpload value={bannerUrl} onChange={setBannerUrl} />
        </div>
      </div>

      {/* Templates */}
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

        {/* Template Konfirmasi */}
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

      {/* Action buttons */}
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