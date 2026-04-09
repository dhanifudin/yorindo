'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { StepIndicator } from '@/components/ui/step-indicator'

const schema = z.object({
  phone: z.string().regex(
    /^(\+62|08)\d{8,12}$/,
    'Nomor telepon tidak valid. Gunakan format +62 atau 08.'
  ),
  email: z.string().email('Format email tidak valid'),
  confirmed: z.literal(true, {
    error: 'Anda harus menyetujui pernyataan ini untuk melanjutkan',
  }),
})

type FormValues = z.infer<typeof schema>

type ErasureStep = 'warning' | 'form' | 'success'

const STEPS = ['Peringatan', 'Konfirmasi', 'Selesai']

const STEP_INDEX: Record<ErasureStep, number> = {
  warning: 0,
  form: 1,
  success: 2,
}

export default function ErasurePage() {
  const [step, setStep] = useState<ErasureStep>('warning')

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  // eslint-disable-next-line react-hooks/incompatible-library
  const confirmed = watch('confirmed')

  const onSubmit = async (values: FormValues) => {
    const res = await fetch('/api/participants/erasure-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: values.phone, email: values.email }),
    })
    if (res.ok || res.status === 202) {
      setStep('success')
    }
  }

  if (step === 'success') {
    return (
      <div>
        <StepIndicator steps={STEPS} currentStep={STEP_INDEX.success} />
        <div className="text-center py-8">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-xl font-bold mb-2">Permintaan Penghapusan Diterima</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Permintaan penghapusan data Anda telah diterima dan sedang diproses. Proses anonimisasi akan selesai dalam 30 hari kerja.
          </p>
          <Link href="/data-rights" className="mt-6 inline-block text-sm text-primary hover:underline">
            ← Kembali ke Hak Data
          </Link>
        </div>
      </div>
    )
  }

  if (step === 'warning') {
    return (
      <div>
        <StepIndicator steps={STEPS} currentStep={STEP_INDEX.warning} />
        <Link href="/data-rights" className="text-sm text-primary hover:underline mb-4 inline-block">
          ← Kembali
        </Link>

        <Card className="border-destructive bg-destructive/5 mb-6">
          <CardContent className="pt-5">
            <h1 className="text-xl font-bold text-destructive mb-2">⚠️ Peringatan: Penghapusan Data Permanen</h1>
            <p className="text-sm text-destructive/90 leading-relaxed">
              Tindakan ini akan menganonimkan seluruh data pribadi Anda secara permanen di semua catatan EM · U.
              <strong className="font-semibold"> Tindakan ini tidak dapat dibatalkan.</strong>
            </p>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardContent className="pt-5 space-y-3 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Yang akan terjadi:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Nama, email, dan nomor telepon Anda akan dianonimkan</li>
              <li>Riwayat pendaftaran event Anda akan tetap ada namun tidak terhubung ke identitas Anda</li>
              <li>Anda tidak akan dapat memulihkan data ini setelah proses selesai</li>
            </ul>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button variant="outline" asChild className="flex-1">
            <Link href="/data-rights">Batal</Link>
          </Button>
          <Button
            variant="destructive"
            className="flex-1"
            onClick={() => setStep('form')}
          >
            Lanjutkan
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <StepIndicator steps={STEPS} currentStep={STEP_INDEX.form} />
      <button onClick={() => setStep('warning')} className="text-sm text-primary hover:underline mb-4 inline-block">
        ← Kembali
      </button>
      <h1 className="text-xl font-bold mb-6">Konfirmasi Penghapusan Data</h1>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div>
          <label htmlFor="erasure-phone" className="block text-sm font-medium mb-1">
            Nomor Telepon <span className="text-destructive">*</span>
          </label>
          <Input
            id="erasure-phone"
            type="tel"
            {...register('phone')}
            placeholder="+62812xxxxxxxx atau 0812xxxxxxxx"
          />
          {errors.phone && <p className="mt-1 text-xs text-destructive">{errors.phone.message}</p>}
        </div>

        <div>
          <label htmlFor="erasure-email" className="block text-sm font-medium mb-1">
            Alamat Email <span className="text-destructive">*</span>
          </label>
          <Input
            id="erasure-email"
            type="email"
            {...register('email')}
            placeholder="contoh@email.com"
          />
          {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>}
        </div>

        <Card>
          <CardContent className="pt-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                {...register('confirmed')}
                className="mt-0.5 h-4 w-4 rounded border-input text-destructive focus:ring-destructive"
              />
              <span className="text-sm">
                Saya memahami bahwa penghapusan data bersifat permanen dan tidak dapat dibatalkan. Saya setuju untuk melanjutkan proses ini.
              </span>
            </label>
            {errors.confirmed && <p className="mt-2 text-xs text-destructive">{errors.confirmed.message}</p>}
          </CardContent>
        </Card>

        <Button
          type="submit"
          variant="destructive"
          className="w-full"
          disabled={isSubmitting || !confirmed}
        >
          {isSubmitting ? 'Memproses...' : 'Hapus Data Saya'}
        </Button>
      </form>
    </div>
  )
}
