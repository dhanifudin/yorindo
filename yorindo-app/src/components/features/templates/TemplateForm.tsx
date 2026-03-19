'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useCreateTemplate, useUpdateTemplate, type Template, type CreateTemplateBody } from '@/hooks/useTemplates'
import { TemplatePreview } from './TemplatePreview'

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

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label htmlFor="tmpl-name" className="block text-sm font-medium text-gray-700 mb-1">
              Nama Template <span className="text-red-500">*</span>
            </label>
            <input
              id="tmpl-name"
              type="text"
              {...register('name')}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="tmpl-type" className="block text-sm font-medium text-gray-700 mb-1">
                Tipe
              </label>
              <select
                id="tmpl-type"
                {...register('type')}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="invitation">Undangan</option>
                <option value="confirmation">Konfirmasi</option>
                <option value="rejection">Penolakan</option>
                <option value="cancellation">Pembatalan</option>
              </select>
            </div>
            <div>
              <label htmlFor="tmpl-channel" className="block text-sm font-medium text-gray-700 mb-1">
                Channel
              </label>
              <select
                id="tmpl-channel"
                {...register('channel')}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="whatsapp">WhatsApp</option>
                <option value="email">Email</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="tmpl-body" className="block text-sm font-medium text-gray-700 mb-1">
              Isi Pesan <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-gray-400 mb-1">
              Gunakan <code className="bg-gray-100 px-1 rounded">{'{{variabel}}'}</code>: name, event_title, date, venue
            </p>
            <textarea
              id="tmpl-body"
              {...register('body')}
              rows={6}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            />
            {errors.body && <p className="mt-1 text-xs text-red-500">{errors.body.message}</p>}
          </div>
        </div>

        <div>
          <TemplatePreview body={bodyValue} />
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-gray-100">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Batal
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isPending ? 'Menyimpan...' : template ? 'Simpan Perubahan' : 'Buat Template'}
        </button>
      </div>
    </form>
  )
}
