'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Check, ChevronsUpDown, X, Loader2, ImageIcon } from 'lucide-react'
import Image from 'next/image'
import { useCreateEvent, useUpdateEvent } from '@/hooks/useEvents'
import { useVendors } from '@/hooks/useVendors'
import { useEventSponsors } from '@/hooks/useEventSponsors'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import type { Event } from '@/types/api'

/* ===================== TYPES ===================== */

interface Vendor {
  id: string
  name: string
}

/* ===================== CONSTANT ===================== */

const INDUSTRIES = [
  { slug: 'teknologi', label: 'Teknologi' },
  { slug: 'kesehatan', label: 'Kesehatan' },
  { slug: 'keuangan', label: 'Keuangan' },
]

/* ===================== SCHEMA ===================== */

const schema = z.object({
  name: z.string().min(1, 'Nama wajib diisi'),
  eventDateOnly: z.string().min(1),
  eventTime: z.string().min(1),
  timezone: z.enum(['Asia/Jakarta', 'Asia/Makassar', 'Asia/Jayapura']),
  is_paid: z.boolean().optional(),
  price: z.string().optional(),
  bannerUrl: z.string().url('URL tidak valid').optional().or(z.literal('')),
})

type FormValues = z.infer<typeof schema>

/* ===================== COMPONENT ===================== */

export function EventCreateForm({
  event,
  onSuccess,
  onCancel,
}: {
  event?: Event
  onSuccess: () => void
  onCancel: () => void
}) {
  const isEdit = !!event

  const { mutate: createEvent, isPending: isCreating } = useCreateEvent()
  const { mutate: updateEvent, isPending: isUpdating } = useUpdateEvent(event?.id ?? '')

  const { data: vendorsData } = useVendors()
  const { data: existingSponsors } = useEventSponsors(event?.id ?? '')

  const [industryTags, setIndustryTags] = useState<string[]>(event?.industryTags ?? [])

  const [selectedVendorIds, setSelectedVendorIds] = useState<string[]>([])

  const isPending = isEdit ? isUpdating : isCreating

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: event?.name ?? '',
      eventDateOnly: event?.eventDate?.slice(0, 10) ?? '',
      eventTime: event?.eventDate?.slice(11, 16) ?? '',
      timezone: event?.timezone ?? 'Asia/Jakarta',
      is_paid: event?.is_paid ?? false,
      price: event?.price ? String(event.price) : '',
      bannerUrl: event?.bannerUrl ?? '',
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

  const allVendors: Vendor[] = vendorsData?.data ?? []
  const selectedVendors = allVendors.filter((v) => selectedVendorIds.includes(v.id))

  const toggleVendor = (id: string) => {
    setSelectedVendorIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const toggleIndustry = (slug: string) => {
    setIndustryTags((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    )
  }

  const onSubmit = (values: FormValues) => {
    const eventDate = new Date(
      `${values.eventDateOnly}T${values.eventTime}`
    ).toISOString()

    const body = {
      name: values.name,
      eventDate,
      timezone: values.timezone,
      bannerUrl: values.bannerUrl,
      industryTags,
      is_paid: values.is_paid ?? false,
      price: values.price ? Number(values.price) : 0,
    }


    if (isEdit) {
      updateEvent(body, { onSuccess })
    } else {
      createEvent(body, { onSuccess })
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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


      <div>
        <Label>Nama Event</Label>
        <Input {...register('name')} />
        {errors.name && <p className="text-red-500 text-sm">{errors.name.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Input type="date" {...register('eventDateOnly')} />
        <Input type="time" {...register('eventTime')} />
      </div>

      <div>
        <Label>Timezone</Label>
        <select {...register('timezone')} className="border rounded p-2 w-full">
          <option value="Asia/Jakarta">WIB</option>
          <option value="Asia/Makassar">WITA</option>
          <option value="Asia/Jayapura">WIT</option>
        </select>
      </div>

      <div>
        <Label>Industri</Label>
        <div className="flex gap-2 flex-wrap">
          {INDUSTRIES.map((ind) => (
            <Button
              key={ind.slug}
              type="button"
              variant={industryTags.includes(ind.slug) ? 'default' : 'outline'}
              onClick={() => toggleIndustry(ind.slug)}
            >
              {ind.label}
            </Button>
          ))}
        </div>
      </div>

      <div>
        <Label>Vendor</Label>

        <div className="flex flex-wrap gap-2">
          {allVendors.map((v) => (
            <Badge
              key={v.id}
              className="cursor-pointer"
              onClick={() => toggleVendor(v.id)}
            >
              {v.name}
            </Badge>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 mt-2">
          {selectedVendors.map((v) => (
            <Badge key={v.id}>
              {v.name}
              <X
                className="ml-1 cursor-pointer"
                onClick={() => toggleVendor(v.id)}
              />
            </Badge>
          ))}
        </div>
      </div>

      <div>
        <Label>Paid Event</Label>
        <input type="checkbox" {...register('is_paid')} />
      </div>

      {isPaidWatched && (
        <div>
          <Input placeholder="Harga" {...register('price')} />
        </div>
      )}

      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? <Loader2 className="animate-spin" /> : isEdit ? 'Update' : 'Create'}
        </Button>
      </div>
    </form>
  )
}