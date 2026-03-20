'use client'

import { useState, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useCreateEvent } from '@/hooks/useEvents'
import { useTemplates } from '@/hooks/useTemplates'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

const schema = z.object({
  name: z.string().min(1, 'Nama event wajib diisi'),
  description: z.string().optional(),
  eventDate: z.string().min(1, 'Tanggal event wajib diisi'),
  timezone: z.enum(['Asia/Jakarta', 'Asia/Makassar', 'Asia/Jayapura']),
  capacity: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface EventCreateFormProps {
  onSuccess: () => void
  onCancel: () => void
}

export function EventCreateForm({ onSuccess, onCancel }: EventCreateFormProps) {
  const { mutate, isPending, isError } = useCreateEvent()
  const { data: templates = [], isLoading: isLoadingTemplates } = useTemplates()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { timezone: 'Asia/Jakarta' },
  })

  const [bannerUrl, setBannerUrl] = useState('')
  const [blastTemplateId, setBlastTemplateId] = useState('')
  const [confirmationTemplateId, setConfirmationTemplateId] = useState('')
  const [rejectionTemplateId, setRejectionTemplateId] = useState('')

  const invitationTemplates = useMemo(
    () => templates.filter((t) => t.type === 'invitation'),
    [templates]
  )
  const confirmationTemplates = useMemo(
    () => templates.filter((t) => t.type === 'confirmation'),
    [templates]
  )
  const rejectionTemplates = useMemo(
    () => templates.filter((t) => t.type === 'rejection'),
    [templates]
  )

  const onSubmit = (values: FormValues) => {
    const capacity = values.capacity ? parseInt(values.capacity, 10) : undefined
    mutate(
      {
        name: values.name,
        description: values.description,
        eventDate: new Date(values.eventDate).toISOString(),
        timezone: values.timezone,
        capacity,
        ...(bannerUrl && { bannerUrl }),
        ...(blastTemplateId && { blastTemplateId }),
        ...(confirmationTemplateId && { confirmationTemplateId }),
        ...(rejectionTemplateId && { rejectionTemplateId }),
      },
      { onSuccess }
    )
  }

  // Shared native select styling that matches shadcn/ui Input
  const selectClassName =
    'h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50'

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
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

      <div>
        <Label htmlFor="description">Deskripsi</Label>
        <Textarea
          id="description"
          {...register('description')}
          rows={3}
          placeholder="Deskripsi singkat event..."
        />
      </div>

      <div>
        <Label htmlFor="eventDate">
          Tanggal & Waktu <span className="text-destructive">*</span>
        </Label>
        <Input
          id="eventDate"
          type="datetime-local"
          {...register('eventDate')}
          aria-invalid={!!errors.eventDate}
        />
        {errors.eventDate && <p className="mt-1 text-xs text-destructive">{errors.eventDate.message}</p>}
      </div>

      <div>
        <Label htmlFor="timezone">Zona Waktu</Label>
        <select id="timezone" {...register('timezone')} className={selectClassName}>
          <option value="Asia/Jakarta">WIB (Asia/Jakarta)</option>
          <option value="Asia/Makassar">WITA (Asia/Makassar)</option>
          <option value="Asia/Jayapura">WIT (Asia/Jayapura)</option>
        </select>
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
        <p className="text-sm text-destructive">Gagal membuat event. Silakan coba lagi.</p>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Batal
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Menyimpan...' : 'Buat Event'}
        </Button>
      </div>
    </form>
  )
}
