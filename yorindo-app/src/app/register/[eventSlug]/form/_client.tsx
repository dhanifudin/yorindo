'use client'

import { use, useState, useRef } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import type { Event, Contact } from '@/types/api'

const EVENT_TYPE_LABELS: Record<string, string> = {
  conference: 'Conference',
  workshop: 'Workshop',
  networking: 'Networking',
  seminar: 'Seminar',
  webinar: 'Webinar',
}

interface RegistrationFormPageProps {
  params: Promise<{ eventSlug: string }>
}

interface FormData {
  name: string
  email: string
  phone: string
  surveyAnswers: Record<string, string>
  consent: boolean
}

const STEPS = ['Informasi Kontak', 'Survei', 'Konfirmasi']

export default function RegistrationFormPage({ params }: RegistrationFormPageProps) {
  const { eventSlug } = use(params)
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<FormData>({ name: '', email: '', phone: '', surveyAnswers: {}, consent: false })
  const [submitted, setSubmitted] = useState(false)
  const [regId, setRegId] = useState<string | null>(null)
  const phoneDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { data: event } = useQuery<Event>({
    queryKey: ['public-event-form', eventSlug],
    queryFn: () => fetch(`/api/events/public/${eventSlug}`).then((r) => r.json()),
  })

  const { data: survey } = useQuery<{ fields: Array<{ id: string; type: string; label: string; required: boolean; options?: string[] }> }>({
    queryKey: ['survey-public', event?.id],
    queryFn: () => fetch(`/api/events/${event!.id}/survey`).then((r) => r.json()),
    enabled: !!event?.id && step === 1,
  })

  const lookupMutation = useMutation({
    mutationFn: async (phone: string) => {
      const res = await fetch(`/api/contacts/lookup?phone=${encodeURIComponent(phone)}`)
      if (!res.ok) return null
      return res.json() as Promise<Contact | null>
    },
    onSuccess: (contact) => {
      if (contact) {
        setForm((p) => ({
          ...p,
          name: contact.name || p.name,
          email: contact.email || p.email,
        }))
        toast.info('Data Anda ditemukan dan sudah diisi otomatis')
      }
    },
  })

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!event) throw new Error('Event not found')
      const res = await fetch('/api/registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: event.id,
          name: form.name,
          email: form.email,
          phone: form.phone,
          surveyAnswers: form.surveyAnswers,
        }),
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

  const handlePhoneBlur = () => {
    if (!form.phone || form.phone.length < 8) return
    if (phoneDebounceRef.current) clearTimeout(phoneDebounceRef.current)
    phoneDebounceRef.current = setTimeout(() => lookupMutation.mutate(form.phone), 300)
  }

  // Build Google Calendar deep link
  const calendarLink = event
    ? `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.name)}&dates=${encodeURIComponent(
        new Date(event.eventDate).toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z'
      )}/${encodeURIComponent(new Date(new Date(event.eventDate).getTime() + 2 * 3600000).toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z')}&details=${encodeURIComponent(event.description ?? '')}`
    : '#'

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
              <div className="space-y-1.5">
                <Label htmlFor="phone">
                  Nomor Telepon <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                  onBlur={handlePhoneBlur}
                  placeholder="+628..."
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="name">
                  Nama Lengkap <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Nama lengkap Anda"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">
                  Email <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder="email@contoh.com"
                />
              </div>
              <Button
                className="w-full h-11"
                onClick={() => setStep(1)}
                disabled={!form.name || !form.email || !form.phone}
              >
                Lanjut →
              </Button>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Survei Event</h2>
              {!survey?.fields.length ? (
                <p className="text-muted-foreground text-sm">Tidak ada pertanyaan survei untuk event ini.</p>
              ) : (
                survey.fields.map((field) => (
                  <div key={field.id} className="space-y-1.5">
                    <Label htmlFor={`survey-${field.id}`}>
                      {field.label}
                      {field.required && <span className="text-destructive ml-1">*</span>}
                    </Label>
                    {field.type === 'text' && (
                      <Input
                        id={`survey-${field.id}`}
                        value={form.surveyAnswers[field.id] ?? ''}
                        onChange={(e) =>
                          setForm((p) => ({
                            ...p,
                            surveyAnswers: { ...p.surveyAnswers, [field.id]: e.target.value },
                          }))
                        }
                      />
                    )}
                    {(field.type === 'single-choice' || field.type === 'select') && (
                      <Select
                        value={form.surveyAnswers[field.id] ?? ''}
                        onValueChange={(val) =>
                          setForm((p) => ({
                            ...p,
                            surveyAnswers: { ...p.surveyAnswers, [field.id]: val },
                          }))
                        }
                      >
                        <SelectTrigger id={`survey-${field.id}`}>
                          <SelectValue placeholder="Pilih..." />
                        </SelectTrigger>
                        <SelectContent>
                          {field.options?.map((opt) => (
                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                ))
              )}
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(0)}>← Kembali</Button>
                <Button className="flex-1" onClick={() => setStep(2)}>Lanjut →</Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Konfirmasi</h2>
              <div className="rounded-lg bg-muted/50 p-4 space-y-2 text-sm">
                <p><span className="text-muted-foreground">Nama:</span> {form.name}</p>
                <p><span className="text-muted-foreground">Email:</span> {form.email}</p>
                <p><span className="text-muted-foreground">Telepon:</span> {form.phone}</p>
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
                <Button variant="outline" onClick={() => setStep(1)}>← Kembali</Button>
                <Button
                  className="flex-1 h-11"
                  onClick={() => submitMutation.mutate()}
                  disabled={!form.consent || submitMutation.isPending}
                >
                  {submitMutation.isPending ? 'Mendaftar…' : 'Daftar Sekarang'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
