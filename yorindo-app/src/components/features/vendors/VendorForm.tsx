'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useCreateVendor, useUpdateVendor } from '@/hooks/useVendors'
import type { Vendor } from '@/types/api'

const INDUSTRIES = [
  { slug: 'teknologi', label: 'Teknologi' },
  { slug: 'keuangan', label: 'Keuangan' },
  { slug: 'manufaktur', label: 'Manufaktur' },
  { slug: 'kesehatan', label: 'Kesehatan' },
  { slug: 'retail', label: 'Retail' },
  { slug: 'properti', label: 'Properti' },
  { slug: 'pendidikan', label: 'Pendidikan' },
  { slug: 'energi', label: 'Energi' },
  { slug: 'telekomunikasi', label: 'Telekomunikasi' },
]

const schema = z.object({
  name: z.string().min(1, 'Nama vendor wajib diisi'),
  contact_email: z.string().min(1, 'Email wajib diisi').email('Format email tidak valid'),
  website: z.string().url('Format URL tidak valid').optional().or(z.literal('')),
  logo_url: z.string().url('Format URL tidak valid').optional().or(z.literal('')),
  industry: z.string().optional(),
  notes: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface VendorFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  vendor?: Vendor
}

export function VendorForm({ open, onOpenChange, vendor }: VendorFormProps) {
  const isEdit = !!vendor
  const { mutate: createVendor, isPending: isCreating } = useCreateVendor()
  const { mutate: updateVendor, isPending: isUpdating } = useUpdateVendor(vendor?.id ?? '')

  const isPending = isEdit ? isUpdating : isCreating

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: vendor?.name ?? '',
      contact_email: vendor?.contact_email ?? '',
      website: vendor?.website ?? '',
      logo_url: vendor?.logo_url ?? '',
      industry: vendor?.industry ?? '',
      notes: vendor?.notes ?? '',
    },
  })

  useEffect(() => {
    if (open) {
      reset({
        name: vendor?.name ?? '',
        contact_email: vendor?.contact_email ?? '',
        website: vendor?.website ?? '',
        logo_url: vendor?.logo_url ?? '',
        industry: vendor?.industry ?? '',
        notes: vendor?.notes ?? '',
      })
    }
  }, [open, vendor, reset])

  const onSubmit = (values: FormValues) => {
    const body = {
      name: values.name,
      contact_email: values.contact_email,
      ...(values.website && { website: values.website }),
      ...(values.logo_url && { logo_url: values.logo_url }),
      ...(values.industry && { industry: values.industry }),
      ...(values.notes && { notes: values.notes }),
    }

    const handleSuccess = () => {
      reset()
      onOpenChange(false)
    }

    if (isEdit) {
      updateVendor(body, { onSuccess: handleSuccess })
    } else {
      createVendor(body, { onSuccess: handleSuccess })
    }
  }

  const selectClassName =
    'h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Vendor' : 'Tambah Vendor'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4 pt-2">
          <div>
            <Label htmlFor="vendor-name">
              Nama Vendor <span className="text-destructive">*</span>
            </Label>
            <Input
              id="vendor-name"
              {...register('name')}
              placeholder="Contoh: Alibaba Cloud"
              aria-invalid={!!errors.name}
            />
            {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div>
            <Label htmlFor="vendor-email">
              Email Kontak <span className="text-destructive">*</span>
            </Label>
            <Input
              id="vendor-email"
              type="email"
              {...register('contact_email')}
              placeholder="sponsor@perusahaan.com"
              aria-invalid={!!errors.contact_email}
            />
            {errors.contact_email && (
              <p className="mt-1 text-xs text-destructive">{errors.contact_email.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="vendor-industry">Industri</Label>
            <select id="vendor-industry" {...register('industry')} className={selectClassName}>
              <option value="">— Pilih industri —</option>
              {INDUSTRIES.map((ind) => (
                <option key={ind.slug} value={ind.slug}>{ind.label}</option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="vendor-website">Website</Label>
            <Input
              id="vendor-website"
              type="url"
              {...register('website')}
              placeholder="https://perusahaan.com"
              aria-invalid={!!errors.website}
            />
            {errors.website && (
              <p className="mt-1 text-xs text-destructive">{errors.website.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="vendor-logo">Logo URL</Label>
            <Input
              id="vendor-logo"
              type="url"
              {...register('logo_url')}
              placeholder="https://cdn.perusahaan.com/logo.png"
              aria-invalid={!!errors.logo_url}
            />
            {errors.logo_url && (
              <p className="mt-1 text-xs text-destructive">{errors.logo_url.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="vendor-notes">Catatan Internal</Label>
            <Textarea
              id="vendor-notes"
              {...register('notes')}
              rows={2}
              placeholder="Catatan untuk tim EM · U..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Tambah Vendor'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
