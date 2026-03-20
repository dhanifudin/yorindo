'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useCreateTemplate, useUpdateTemplate, type Template, type CreateTemplateBody } from '@/hooks/useTemplates'
import { TemplatePreview } from './TemplatePreview'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

const schema = z.object({
  name: z.string().min(1, 'Nama template wajib diisi'),
  type: z.enum(['invitation', 'confirmation', 'rejection', 'cancellation']),
  channel: z.enum(['email', 'whatsapp']),
  body: z.string().min(10, 'Isi pesan minimal 10 karakter'),
})

type FormValues = z.infer<typeof schema>

interface TemplateFormProps {
  template?: Template
  onSuccess: () => void
  onCancel: () => void
}

export function TemplateForm({ template, onSuccess, onCancel }: TemplateFormProps) {
  const { mutate: create, isPending: isCreating } = useCreateTemplate()
  const { mutate: update, isPending: isUpdating } = useUpdateTemplate()
  const isPending = isCreating || isUpdating

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: template
      ? { name: template.name, type: template.type, channel: template.channel, body: template.body }
      : { type: 'invitation', channel: 'whatsapp' },
  })

  const bodyValue = watch('body') ?? ''

  const onSubmit = (values: FormValues) => {
    const payload: CreateTemplateBody = {
      name: values.name,
      type: values.type,
      channel: values.channel,
      body: values.body,
    }
    if (template) {
      update({ id: template.id, ...payload }, { onSuccess })
    } else {
      create(payload, { onSuccess })
    }
  }

  const selectClassName =
    'h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="tmpl-name">
              Nama Template <span className="text-destructive">*</span>
            </Label>
            <Input
              id="tmpl-name"
              type="text"
              {...register('name')}
              aria-invalid={!!errors.name}
            />
            {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="tmpl-type">Tipe</Label>
              <select id="tmpl-type" {...register('type')} className={selectClassName}>
                <option value="invitation">Undangan</option>
                <option value="confirmation">Konfirmasi</option>
                <option value="rejection">Penolakan</option>
                <option value="cancellation">Pembatalan</option>
              </select>
            </div>
            <div>
              <Label htmlFor="tmpl-channel">Channel</Label>
              <select id="tmpl-channel" {...register('channel')} className={selectClassName}>
                <option value="whatsapp">WhatsApp</option>
                <option value="email">Email</option>
              </select>
            </div>
          </div>

          <div>
            <Label htmlFor="tmpl-body">
              Isi Pesan <span className="text-destructive">*</span>
            </Label>
            <p className="text-xs text-muted-foreground mb-1">
              Gunakan <code className="bg-muted px-1 rounded text-foreground">{'{{variabel}}'}</code>: name, event_title, date, venue
            </p>
            <Textarea
              id="tmpl-body"
              {...register('body')}
              rows={6}
              className="font-mono"
              aria-invalid={!!errors.body}
            />
            {errors.body && <p className="mt-1 text-xs text-destructive">{errors.body.message}</p>}
          </div>
        </div>

        <div>
          <TemplatePreview body={bodyValue} />
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-border">
        <Button type="button" variant="outline" onClick={onCancel}>
          Batal
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Menyimpan...' : template ? 'Simpan Perubahan' : 'Buat Template'}
        </Button>
      </div>
    </form>
  )
}
