'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const schema = z.object({
  phone: z.string().regex(
    /^(\+62|08)\d{8,12}$/,
    'Nomor telepon tidak valid. Gunakan format +62 atau 08.'
  ),
  email: z.string().email('Format email tidak valid'),
})

type FormValues = z.infer<typeof schema>

type PageState = 'form' | 'success'

export default function DataRequestPage() {
  const [pageState, setPageState] = useState<PageState>('form')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const onSubmit = async (values: FormValues) => {
    const res = await fetch('/api/participants/data-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    })
    if (res.ok || res.status === 202) {
      setPageState('success')
    }
  }

  if (pageState === 'success') {
    return (
      <div className="text-center py-8">
        <div className="text-5xl mb-4">✅</div>
        <h2 className="text-xl font-bold mb-2">Permintaan Diterima</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Permintaan Anda sedang diproses. Kami akan mengirim salinan data ke email Anda dalam 24 jam sesuai ketentuan UU PDP.
        </p>
        <Link href="/data-rights" className="mt-6 inline-block text-sm text-primary hover:underline">
          ← Kembali ke Hak Data
        </Link>
      </div>
    )
  }

  return (
    <div>
      <Link href="/data-rights" className="text-sm text-primary hover:underline mb-4 inline-block">
        ← Kembali
      </Link>
      <h1 className="text-xl font-bold mb-2">Minta Salinan Data</h1>
      <p className="text-muted-foreground text-sm mb-6">
        Kami akan mengirimkan salinan data pribadi Anda ke alamat email yang terdaftar dalam waktu 24 jam.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div>
          <label htmlFor="phone" className="block text-sm font-medium mb-1">
            Nomor Telepon <span className="text-destructive">*</span>
          </label>
          <Input
            id="phone"
            type="tel"
            {...register('phone')}
            placeholder="+62812xxxxxxxx atau 0812xxxxxxxx"
          />
          {errors.phone && <p className="mt-1 text-xs text-destructive">{errors.phone.message}</p>}
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-1">
            Alamat Email <span className="text-destructive">*</span>
          </label>
          <Input
            id="email"
            type="email"
            {...register('email')}
            placeholder="contoh@email.com"
          />
          {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>}
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Memproses...' : 'Kirim Permintaan'}
        </Button>
      </form>
    </div>
  )
}
