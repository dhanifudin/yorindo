import Link from 'next/link'
import { PublicShell } from '@/components/layout/PublicShell'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

const FEATURES = [
  {
    icon: '📅',
    title: 'Manajemen Event',
    description: 'Buat dan kelola event dari awal hingga selesai — konfigurasi, jadwal, kapasitas, dan siklus hidup event dalam satu platform.',
  },
  {
    icon: '👥',
    title: 'Database Kontak & Peserta',
    description: 'Import, normalisasi, dan kelola ribuan kontak dengan deteksi duplikat otomatis dan validasi data berbasis AI.',
  },
  {
    icon: '📱',
    title: 'Check-in QR Code',
    description: 'Aplikasi check-in berbasis PWA yang bekerja secara offline — scan QR code peserta dengan cepat di hari pelaksanaan event.',
  },
  {
    icon: '📊',
    title: 'Analitik & Laporan',
    description: 'Pantau kehadiran secara real-time, unduh laporan Excel/PDF, dan dapatkan insight cerdas dari YoriMind AI.',
  },
]

export default function LandingPage() {
  return (
    <PublicShell className="max-w-4xl">
      {/* Hero */}
      <section className="py-16 text-center">
        <h1 className="text-4xl font-bold tracking-tight mb-4">Yorindo</h1>
        <p className="text-xl text-muted-foreground mb-3">
          Platform Manajemen Event Profesional
        </p>
        <p className="text-muted-foreground max-w-lg mx-auto mb-10">
          Kelola seluruh siklus event Anda — dari undangan blast hingga check-in hari-H —
          dalam satu platform yang terintegrasi dan mudah digunakan.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild size="lg">
            <Link href="/login">Masuk</Link>
          </Button>
          <Button variant="outline" size="lg" disabled>
            Daftar Event
          </Button>
        </div>
      </section>

      {/* Features */}
      <section className="py-8">
        <h2 className="text-xl font-semibold text-center mb-8">Fitur Unggulan</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {FEATURES.map((feature) => (
            <Card key={feature.title}>
              <CardContent className="pt-6 pb-5">
                <div className="text-3xl mb-3">{feature.icon}</div>
                <h3 className="font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-16 pt-8 border-t border-border text-center text-sm text-muted-foreground">
        <p>© {new Date().getFullYear()} Yorindo. All rights reserved.</p>
        <Link href="/data-rights" className="underline hover:text-foreground mt-1 inline-block">
          Hak Data Anda
        </Link>
      </footer>
    </PublicShell>
  )
}
