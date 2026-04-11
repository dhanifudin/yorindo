'use client'

import { use, useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Combobox } from '@/components/ui/combobox'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'
import { UserPlus, Loader2, Users } from 'lucide-react'
import type { RegistrationWithContact } from '@/types/api'

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
  'Lainnya',
]

const STATUS_BADGE_CLASS: Record<string, string> = {
  pending: 'bg-orange-100 text-orange-700',
  confirmed: 'bg-blue-100 text-blue-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-destructive/10 text-destructive',
  waitlisted: 'bg-muted text-muted-foreground',
  attended: 'bg-purple-100 text-purple-700',
  cancelled: 'bg-muted text-muted-foreground',
}

export default function OnTheSpotPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const queryClient = useQueryClient()

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    title: '', // Jabatan
    industry: '',
  })
  const [isLookingUp, setIsLookingUp] = useState(false)
  const [hasAutoFilled, setHasAutoFilled] = useState(false)

  // Debounced contact lookup by email
  useEffect(() => {
    if (!form.email || form.email.length < 3 || hasAutoFilled) return

    const timer = setTimeout(async () => {
      setIsLookingUp(true)
      try {
        const res = await fetch(`/api/contacts/lookup?email=${encodeURIComponent(form.email)}`)
        if (res.ok) {
          const contact = await res.json()
          if (contact) {
            setForm((prev) => ({
              ...prev,
              name: contact.name ?? prev.name,
              phone: contact.phone ?? prev.phone,
              industry: contact.serviceType ?? prev.industry,
              title: contact.jobTitle ?? prev.title,
            }))
            setHasAutoFilled(true)
            toast.info(`Kontek ditemukan: ${contact.name}`, {
              description: 'Data otomatis diisi dari database kontak',
              duration: 4000,
            })
          }
        }
      } catch {
        // Ignore lookup errors silently
      } finally {
        setIsLookingUp(false)
      }
    }, 600) // 600ms debounce

    return () => clearTimeout(timer)
  }, [form.email, hasAutoFilled])

  const { data: registrationsData, isLoading: isLoadingRegs } = useQuery<{ data: RegistrationWithContact[] }>({
    queryKey: ['event-registrations', id],
    queryFn: () => fetch(`/api/registrations?eventId=${id}&pageSize=10`).then(r => r.json()),
    enabled: !!id,
  })

  const registerMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const res = await fetch(`/api/events/${id}/ots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          phone: data.phone,
          industry: data.industry,
          jobTitle: data.title || undefined,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error?.message || 'Gagal melakukan pendaftaran')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('Pendaftaran berhasil! Peserta langsung tercatat hadir.')
      queryClient.invalidateQueries({ queryKey: ['event-registrations', id] })
      setForm({
        name: '',
        email: '',
        phone: '',
        title: '',
        industry: '',
      })
      setHasAutoFilled(false)
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const isFormValid = form.name && form.email && form.phone && form.industry

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!isFormValid) return
    registerMutation.mutate(form)
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <UserPlus className="w-6 h-6 text-primary" />
            </div>
            <div>
              <CardTitle>On the spot Registration</CardTitle>
              <CardDescription>
                Daftarkan peserta langsung di lokasi acara.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nama Lengkap <span className="text-destructive">*</span></Label>
                <Input
                  id="name"
                  placeholder="Contoh: Budi Santoso"
                  value={form.name}
                  onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email <span className="text-destructive">*</span></Label>
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    placeholder="budi@example.com"
                    value={form.email}
                    onChange={(e) => {
                      setForm(f => ({ ...f, email: e.target.value }))
                      setHasAutoFilled(false)
                    }}
                    required
                    className={isLookingUp ? 'pr-10' : ''}
                  />
                  {isLookingUp && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Masukkan email — data otomatis diisi jika ditemukan di database kontak
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Nomor Telepon <span className="text-destructive">*</span></Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+62812..."
                  value={form.phone}
                  onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Jabatan</Label>
                <Input
                  id="title"
                  placeholder="Contoh: Manager Produksi"
                  value={form.title}
                  onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="industry">Industri <span className="text-destructive">*</span></Label>
                <Combobox
                  options={INDUSTRIES.map(i => ({ value: i, label: i }))}
                  value={form.industry}
                  onValueChange={(v) => setForm(f => ({ ...f, industry: v }))}
                  placeholder="Pilih industri..."
                  searchPlaceholder="Cari industri..."
                  emptyText="Industri tidak ditemukan"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button 
                type="submit" 
                className="w-full md:w-auto px-10 h-11"
                disabled={!isFormValid || registerMutation.isPending}
              >
                {registerMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Memproses...
                  </>
                ) : (
                  'Daftarkan Sekarang'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="mt-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Recent Registrations</CardTitle>
                <CardDescription>
                  Peserta yang baru saja terdaftar (10 terakhir)
                </CardDescription>
              </div>
            </div>
            {isLoadingRegs && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Nama Peserta</TableHead>
                  <TableHead>Industri/Jabatan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Waktu</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {registrationsData?.data && registrationsData.data.length > 0 ? (
                  registrationsData.data.map((reg) => (
                    <TableRow key={reg.id}>
                      <TableCell>
                        <div className="font-medium text-sm">{reg.contactName}</div>
                        <div className="text-xs text-muted-foreground">{reg.contactEmail}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs font-medium">{reg.contactIndustry ?? '-'}</div>
                        <div className="text-xs text-muted-foreground">{reg.contactJobTitle ?? '-'}</div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${STATUS_BADGE_CLASS[reg.status]} text-[10px] px-1.5 py-0`}>
                          {reg.status.charAt(0).toUpperCase() + reg.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {new Date(reg.createdAt).toLocaleTimeString('id-ID', {
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground text-sm">
                      {isLoadingRegs ? 'Memuat data...' : 'Belum ada pendaftaran.'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
