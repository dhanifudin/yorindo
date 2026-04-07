'use client'

import { useState, useEffect } from 'react'
import { useForm, type Resolver, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useCreateTemplate, useUpdateTemplate, type Template } from '@/hooks/useTemplates'
import { TemplatePreview } from './TemplatePreview'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Upload } from 'lucide-react'
import { TiptapEditor } from '@/components/ui/tiptap-editor'

const schema = z.object({
  name: z.string().min(1, 'Nama template wajib diisi'),
  subject: z.string().optional(),
  type: z.enum(['invitation', 'confirmation', 'rejection', 'cancellation']),
  channel: z.enum(['email', 'whatsapp']),
  body: z.string().min(10, 'Isi pesan minimal 10 karakter'),
  logoUrl: z.string().optional(),
  imageType: z.enum(['header', 'background']).default('header'),
  bgOpacity: z.number().min(10).max(70).default(40),
})

type FormValues = z.input<typeof schema>

const VARIABLES = [
  { label: 'Nama User', value: '{{name}}' },
  { label: 'Judul Acara', value: '{{event_title}}' },
  { label: 'Tanggal', value: '{{date}}' },
  { label: 'Lokasi', value: '{{venue}}' },
  { label: 'Industri', value: '{{industry}}' },
  { label: 'Perusahaan', value: '{{company}}' },
  { label: 'Link Konfirmasi', value: '{{confirm_url}}' },
]

export default function TemplateForm({
  template,
  onSuccess,
  onCancel,
}: {
  template?: Template
  onSuccess: () => void
  onCancel: () => void
}) {
  const { mutate: create, isPending: isCreating } = useCreateTemplate()
  const { mutate: update, isPending: isUpdating } = useUpdateTemplate()
  const isPending = isCreating || isUpdating

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: template
      ? {
          name: template.name,
          subject: template.subject ?? '',
          type: template.type,
          channel: template.channel,
          body: template.body,
          logoUrl: template.logoUrl ?? '',
          imageType: template.imageType ?? 'header',
          bgOpacity: template.bgOpacity ?? 40,
        }
      : {
          type: 'invitation',
          channel: 'whatsapp',
          imageType: 'header',
          bgOpacity: 40,
        },
  })

  // eslint-disable-next-line react-hooks/incompatible-library
  const type = watch('type')
  const channel = watch('channel')
  const bodyValue = watch('body') ?? ''
  const logoUrl = watch('logoUrl') ?? ''
  const imageType = watch('imageType')
  const bgOpacity = watch('bgOpacity')
  const subject = watch('subject') ?? ''

  const [logoPreview, setLogoPreview] = useState<string>(logoUrl)

  // Auto default template when type or channel changes
  useEffect(() => {
    if (template) return
    // You can add DEFAULT_TEMPLATES logic here if needed
  }, [type, channel, template])

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string
      setLogoPreview(base64)
      setValue('logoUrl', base64)
    }
    reader.readAsDataURL(file)
  }

  const removeLogo = () => {
    setLogoPreview('')
    setValue('logoUrl', '')
  }

  const handleDragStart = (e: React.DragEvent, variable: string) => {
    e.dataTransfer.setData('text/plain', variable)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const variable = e.dataTransfer.getData('text/plain')
    if (!variable) return

    const editor = document.querySelector('.ProseMirror') as HTMLElement
    if (editor) {
      editor.focus()
      document.execCommand('insertText', false, variable)
    }
    setValue('body', bodyValue + ' ' + variable)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const onSubmit: SubmitHandler<FormValues> = (values) => {
    console.log('✅ Form submitted:', values)   // Debug

    const payload = {
      name: values.name,
      subject: values.subject || undefined,
      type: values.type,
      channel: values.channel,
      body: values.body,
      logoUrl: values.logoUrl,
      imageType: values.imageType,
      bgOpacity: values.bgOpacity,
    }

    if (template) {
      update({ id: template.id, ...payload }, { 
        onSuccess: () => {
          console.log('✅ Update berhasil')
          onSuccess()
        },
        onError: (err) => console.error('❌ Update gagal:', err)
      })
    } else {
      create(payload, { 
        onSuccess: () => {
          console.log('✅ Template baru berhasil dibuat')
          onSuccess()
        },
        onError: (err) => console.error('❌ Create gagal:', err)
      })
    }
  }

  return (
    <form 
      onSubmit={handleSubmit(onSubmit)} 
      noValidate 
      className="space-y-8"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">

        {/* Form Section */}
        <div className="space-y-6">
          <div>
            <Label>Nama Template <span className="text-destructive">*</span></Label>
            <Input {...register('name')} placeholder="Contoh: Undangan ERP Summit" />
            {errors.name && <p className="text-destructive text-xs mt-1">{errors.name.message}</p>}
          </div>

          {channel === 'email' && (
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl">
              <Label className="text-blue-700 font-medium">Subject Email</Label>
              <Input
                {...register('subject')}
                placeholder="Konfirmasi Kehadiran - ERP Summit 2026"
                className="mt-2"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Tipe Pesan</Label>
              <select {...register('type')} className="w-full h-11 border rounded-lg px-4 text-sm">
                <option value="invitation">Undangan</option>
                <option value="confirmation">Konfirmasi</option>
                <option value="rejection">Penolakan</option>
                <option value="cancellation">Pembatalan</option>
              </select>
            </div>
            <div>
              <Label>Channel</Label>
              <select {...register('channel')} className="w-full h-11 border rounded-lg px-4 text-sm">
                <option value="whatsapp">WhatsApp</option>
                <option value="email">Email</option>
              </select>
            </div>
          </div>

          {/* Upload Gambar */}
          <div>
            <Label>Upload Gambar</Label>
            <div className="flex gap-4 mt-2 items-start">
              <label className="cursor-pointer flex-1 border-2 border-dashed border-input hover:border-primary rounded-2xl p-8 text-center">
                <Upload className="mx-auto mb-3 w-8 h-8" />
                <p className="text-sm">Klik untuk upload gambar</p>
                <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
              </label>

              {logoPreview && (
                <div className="flex flex-col items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={logoPreview} alt="preview" className="h-20 w-20 object-contain border rounded-xl" />
                  <Button type="button" variant="destructive" size="sm" onClick={removeLogo}>
                    Hapus
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Variable Drag & Drop */}
          <div>
            <Label className="mb-3 block">Variable (Tarik ke editor)</Label>
            <div className="grid grid-cols-2 gap-2">
              {VARIABLES.map((v) => (
                <div
                  key={v.value}
                  draggable
                  onDragStart={(e) => handleDragStart(e, v.value)}
                  className="bg-white border border-gray-300 hover:border-blue-500 rounded-lg px-4 py-3 text-sm cursor-grab active:cursor-grabbing"
                >
                  {v.label}
                </div>
              ))}
            </div>
          </div>

          {/* Tiptap Editor */}
          <div onDrop={handleDrop} onDragOver={handleDragOver}>
            <Label>Isi Pesan <span className="text-destructive">*</span></Label>
            <TiptapEditor value={bodyValue} onChange={(html) => setValue('body', html)} />
            {errors.body && <p className="text-destructive text-xs mt-1">{errors.body.message}</p>}
          </div>
        </div>

        {/* Preview */}
        <div className="sticky top-6">
          <p className="font-medium mb-3">Preview Langsung</p>
          <TemplatePreview
            body={bodyValue}
            type={type}
            channel={channel}
            logoUrl={logoPreview}
            imageType={imageType}
            bgOpacity={bgOpacity}
            subject={subject}
          />
        </div>
      </div>

      <div className="flex justify-end gap-4 pt-6 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Batal
        </Button>
        <Button type="submit" disabled={isPending} size="lg">
          {isPending ? 'Menyimpan...' : template ? 'Simpan Perubahan' : 'Buat Template'}
        </Button>
      </div>
    </form>
  )
}