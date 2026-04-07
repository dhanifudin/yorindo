 'use client'

import { use, useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import Form from '@rjsf/shadcn'
import validator from '@rjsf/validator-ajv8'
import type { RJSFSchema, UiSchema } from '@rjsf/utils'
import '@rjsf/shadcn/dist/clean-slate.css'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import type { Event } from '@/types/api'
import { MockGoogleAuthDialog } from '@/components/auth/MockGoogleAuthDialog'
import { GoogleIcon } from '@/components/icons/GoogleIcon'
import { surveyCustomWidgets } from '@/components/features/surveys/widgets'

const EVENT_TYPE_LABELS: Record<string, string> = {
  conference: 'Conference',
  workshop: 'Workshop',
  networking: 'Networking',
  seminar: 'Seminar',
  webinar: 'Webinar',
}

const INDUSTRIES = [
  'Otomotif & Suku Cadang (Auto Parts)',
  'Elektronik & Peralatan Rumah Tangga',
  'Fast-Moving Consumer Goods (FMCG)',
  'Makanan & Minuman (F&B)',
  'Farmasi & Alat Kesehatan',
  'Plastik & Kemasan (Packaging)',
  'Fabrikasi Logam & Mesin Presisi',
  'Bahan Kimia Industri',
  'Alat Berat & Karoseri',
  'Tekstil & Garmen',
  'Yang lain',
]

interface RegistrationFormPageProps {
  params: Promise<{ eventSlug: string }>
}

interface FormData {
  name: string
  email: string
  secondaryEmail: string
  phone: string
  company: string
  industry: string
  title: string
  location: string
  surveyAnswers: Record<string, string>
  consent: boolean
}

const STEPS = ['Informasi Kontak', 'Survei', 'Checkout', 'Selesai']

export default function RegistrationFormPage({ params }: RegistrationFormPageProps) {
  const { eventSlug } = use(params)
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<FormData>({ name: '', email: '', secondaryEmail: '', phone: '', company: '', industry: '', title: '', location: '', surveyAnswers: {}, consent: false })
  const [submitted, setSubmitted] = useState(false)
  const [regId, setRegId] = useState<string | null>(null)
  const [ssoFilled, setSsoFilled] = useState(false)
  const [showSsoDialog, setShowSsoDialog] = useState(false)

  const { data: event } = useQuery<Event>({
    queryKey: ['public-event-form', eventSlug],
    queryFn: () => fetch(`/api/events/public/${eventSlug}`).then((r) => r.json()),
  })

  const { data: survey, isLoading: surveyLoading } = useQuery<{ schema: RJSFSchema; uiSchema: UiSchema }>({
    queryKey: ['survey-public', event?.id],
    queryFn: () => fetch(`/api/events/${event!.id}/survey/registration`).then((r) => r.json()),
    enabled: !!event?.id && step === 1,
  })

  // Phone lookup removed per updated acceptance criteria (dedup handled server-side)

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!event) throw new Error('Event not found')
      const body: Record<string, unknown> = {
        eventId: event.id,
        name: form.name,
        email: form.email,
        secondaryEmail: form.secondaryEmail || undefined,
        phone: form.phone,
        company: form.company || undefined,
        industry: form.industry || undefined,
        title: form.title || undefined,
        location: form.location || undefined,
        surveyAnswers: form.surveyAnswers,
      }
      if (event.is_paid === false) {
        body.order = { subtotal: 0, discount: 0, total: 0, currency: 'IDR', payment_method: null }
      }

      const res = await fetch('/api/registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body?.error?.message ?? 'Pendaftaran gagal')
      }
      return res.json()
    },
    onSuccess: (reg) => {
      setRegId(reg.id)
      setSubmitted(true)
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Pendaftaran gagal'),
  })

  // phone blur/lookup removed

  // Build Google Calendar deep link (guard against missing/invalid event date)
  const calendarLink = (() => {
    if (!event?.eventDate) return '#'
    const startMs = Date.parse(event.eventDate)
    if (isNaN(startMs)) return '#'
    const start = new Date(startMs)
    const end = new Date(startMs + 2 * 3600000) // default 2-hour duration
    const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z'
    const dates = `${encodeURIComponent(fmt(start))}/${encodeURIComponent(fmt(end))}`
    const details = encodeURIComponent(event.description ?? '')
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.name)}&dates=${dates}&details=${details}`
  })()

  if (submitted) {
    const shareUrl = `${window.location.origin}/register/${eventSlug}`
    const shareText = `Saya baru mendaftar ke ${event?.name ?? 'event ini'}! Daftar juga di: ${shareUrl}`

    return (
      <div className="max-w-md mx-auto px-4 py-8">
        <Card>
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <div className="text-4xl">🎉</div>
            <h2 className="text-xl font-bold">Pendaftaran Berhasil!</h2>
            <p className="text-muted-foreground text-sm">
              Terima kasih telah mendaftar. Tim kami akan meninjau pendaftaran Anda.
            </p>
            <Badge className="bg-muted text-muted-foreground">ID: {regId}</Badge>
            <div>
              <a
                href={calendarLink}
                target="_blank"
                rel="noreferrer"
                className="text-primary underline text-sm"
              >
                + Tambahkan ke Google Calendar
              </a>
            </div>
            <div className="pt-2 space-y-2">
              <p className="text-xs text-muted-foreground font-medium">Bagikan ke teman:</p>
              <div className="flex justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-green-700 border-green-200 hover:bg-green-50"
                  onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank')}
                >
                  WhatsApp
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(shareUrl)
                    toast.success('Link disalin!')
                  }}
                >
                  Salin Link
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <>
    <MockGoogleAuthDialog
      open={showSsoDialog}
      onOpenChange={setShowSsoDialog}
      onSuccess={(name, email) => {
        setForm((p) => ({ ...p, name, email }))
        setSsoFilled(true)
      }}
    />
    <div className="max-w-md mx-auto px-4 py-6">
      {/* Event details banner */}
      {event && (
        <div className="mb-5 rounded-xl border border-border bg-card p-4 space-y-2">
          <div>
            <h1 className="text-base font-bold leading-snug">{event.name}</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {new Date(event.eventDate).toLocaleDateString('id-ID', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                timeZone: event.timezone,
              })}
            </p>
          </div>
          {(event.venue || event.eventType || event.industryTags?.length) && (
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
              {event.venue && <span>{event.venue}</span>}
              {event.venue && (event.eventType || event.industryTags?.length) && <span>·</span>}
              {event.eventType && (
                <Badge variant="outline" className="text-xs">{EVENT_TYPE_LABELS[event.eventType] ?? event.eventType}</Badge>
              )}
              {event.industryTags?.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step indicator */}
      <div className="flex items-center justify-between mb-6">
        {STEPS.map((label, idx) => (
          <div key={label} className="flex items-center">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium ${
                idx <= step ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}
            >
              {idx + 1}
            </div>
            <span className={`ml-1 text-xs hidden sm:block ${idx === step ? 'font-medium' : 'text-muted-foreground'}`}>
              {label}
            </span>
            {idx < STEPS.length - 1 && (
              <div className={`mx-2 h-px w-6 sm:w-12 ${idx < step ? 'bg-primary' : 'bg-muted'}`} />
            )}
          </div>
        ))}
      </div>

      <Card>
        <CardContent className="pt-6 pb-6">
          {step === 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Informasi Kontak</h2>

              {/* Gmail SSO pre-fill */}
              <Button
                type="button"
                variant="outline"
                className="w-full flex items-center gap-2"
                onClick={() => setShowSsoDialog(true)}
              >
                <GoogleIcon />
                Lanjutkan dengan Google
              </Button>
              <div className="relative flex items-center gap-2">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">atau isi manual</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Required fields */}
              <div className="space-y-1.5">
                <Label htmlFor="name">
                  Nama Lengkap <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => !ssoFilled && setForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder="Nama lengkap Anda"
                    readOnly={ssoFilled}
                    className={ssoFilled ? 'pr-20 bg-muted/40' : ''}
                  />
                  {ssoFilled && (
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-green-600 font-medium">
                      ✓ Terisi dari Google
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="company">
                  Nama Perusahaan/Instansi <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="company"
                  value={form.company}
                  onChange={(e) => setForm((p) => ({ ...p, company: e.target.value }))}
                  placeholder="Perusahaan atau instansi"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email">
                  Email <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => !ssoFilled && setForm((p) => ({ ...p, email: e.target.value }))}
                    placeholder="email@contoh.com"
                    readOnly={ssoFilled}
                    className={ssoFilled ? 'pr-20 bg-muted/40' : ''}
                  />
                  {ssoFilled && (
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-green-600 font-medium">
                      ✓ Terisi dari Google
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="secondaryEmail">
                  Email Perusahaan <span className="text-muted-foreground text-xs">(opsional)</span>
                </Label>
                <Input
                  id="secondaryEmail"
                  type="email"
                  value={form.secondaryEmail}
                  onChange={(e) => setForm((p) => ({ ...p, secondaryEmail: e.target.value }))}
                  placeholder="email@perusahaan.com"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone">
                  No. Handphone (WA) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="+628..."
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="industry">
                  Jenis Industri Manufaktur <span className="text-destructive">*</span>
                </Label>
                <Select value={form.industry} onValueChange={(v) => setForm((p) => ({ ...p, industry: v }))}>
                  <SelectTrigger id="industry">
                    <SelectValue placeholder="Pilih industri" />
                  </SelectTrigger>
                  <SelectContent>
                    {INDUSTRIES.map((ind) => (
                      <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Optional fields */}
              <div className="space-y-1.5">
                <Label htmlFor="title">
                  Jabatan <span className="text-muted-foreground text-xs">(opsional)</span>
                </Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="Jabatan Anda"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="location">
                  Lokasi Kantor/Pabrik <span className="text-muted-foreground text-xs">(opsional)</span>
                </Label>
                <Input
                  id="location"
                  value={form.location}
                  onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
                  placeholder="Kota atau lokasi kantor"
                />
              </div>

              <Button
                className="w-full h-11"
                onClick={() => setStep(1)}
                disabled={!form.name || !form.email || !form.phone || !form.company || !form.industry}
              >
                Lanjut →
              </Button>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Survei Event</h2>
              {surveyLoading ? (
                <div className="h-24 bg-muted rounded animate-pulse" />
              ) : !survey?.schema?.properties || Object.keys(survey.schema.properties).length === 0 ? (
                <div className="space-y-4">
                  <p className="text-muted-foreground text-sm">Tidak ada pertanyaan survei untuk event ini.</p>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setStep(0)}>← Kembali</Button>
                    <Button className="flex-1" onClick={() => setStep(2)}>Lanjut →</Button>
                  </div>
                </div>
              ) : (
                <Form
                  schema={survey.schema}
                  uiSchema={survey.uiSchema}
                  formData={form.surveyAnswers}
                  validator={validator}
                  widgets={surveyCustomWidgets}
                  onSubmit={({ formData }) => {
                    setForm((p) => ({ ...p, surveyAnswers: formData as Record<string, string> }))
                    setStep(2)
                  }}
                >
                  <div className="flex gap-2 pt-2">
                    <Button type="button" variant="outline" onClick={() => setStep(0)}>
                      ← Kembali
                    </Button>
                    <Button type="submit" className="flex-1">
                      Lanjut →
                    </Button>
                  </div>
                </Form>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Checkout</h2>
              <div className="rounded-lg bg-muted/50 p-4 space-y-2 text-sm">
                {/* Event banner */}
                <div className="w-full aspect-video rounded overflow-hidden bg-gradient-to-br from-primary/10 via-muted to-primary/5">
                  {event?.bannerUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={event.bannerUrl} alt={event?.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-primary-foreground/50 font-medium">{event?.name?.split(' ').slice(0,2).map(s => s[0]).join('')}</div>
                  )}
                </div>

                <p className="font-medium">{event?.name}</p>
                <p className="text-xs text-muted-foreground">
                  {event && new Date(event.eventDate).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: event.timezone })}
                </p>

                <div className="rounded-lg bg-white p-3 shadow-sm space-y-1">
                  <p className="text-xs text-muted-foreground">Peserta</p>
                  <p className="font-medium">{form.name}</p>
                  <p className="text-xs text-muted-foreground">{form.company}{form.industry ? ` · ${form.industry}` : ''}</p>
                  <p className="text-xs text-muted-foreground">{form.email}{form.secondaryEmail ? ` · ${form.secondaryEmail}` : ''}</p>
                  <p className="text-xs text-muted-foreground">{form.phone}</p>
                </div>

                {/* Price handling */}
                {event?.is_paid ? (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Subtotal</span>
                    <span className="font-medium">Rp {event.price?.toLocaleString('id-ID')}</span>
                  </div>
                ) : (
                  <div>
                    <span className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded">Gratis</span>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(1)}>← Kembali</Button>
                  <Button
                    className="flex-1 h-11"
                    onClick={() => setStep(3)}
                  >
                    Lanjut ke Konfirmasi →
                  </Button>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Konfirmasi</h2>
              <div className="rounded-lg bg-muted/50 p-4 space-y-2 text-sm">
                <p><span className="text-muted-foreground">Nama:</span> {form.name}</p>
                <p><span className="text-muted-foreground">Perusahaan:</span> {form.company || '-'}</p>
                <p><span className="text-muted-foreground">Industri:</span> {form.industry || '-'}</p>
                <p><span className="text-muted-foreground">Email:</span> {form.email}{form.secondaryEmail ? `, ${form.secondaryEmail}` : ''}</p>
                <p><span className="text-muted-foreground">Telepon:</span> {form.phone}</p>
                {form.title && <p><span className="text-muted-foreground">Jabatan:</span> {form.title}</p>}
                {form.location && <p><span className="text-muted-foreground">Lokasi:</span> {form.location}</p>}
                <p><span className="text-muted-foreground">Event:</span> {event?.name}</p>
              </div>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.consent}
                  onChange={(e) => setForm((p) => ({ ...p, consent: e.target.checked }))}
                  className="mt-1 accent-primary"
                />
                <span className="text-sm text-muted-foreground">
                  Saya menyetujui penggunaan data pribadi saya untuk keperluan event ini sesuai UU PDP.
                </span>
              </label>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(2)}>← Kembali</Button>
                <Button
                  className="flex-1 h-11"
                  onClick={() => submitMutation.mutate()}
                  disabled={!form.consent || submitMutation.isPending}
                >
                  {submitMutation.isPending ? 'Mengirim…' : 'Selesai'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
    </>
  )
}
