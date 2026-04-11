import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  CalendarCheck,
  TicketCheck,
  Users,
  Target,
  CalendarDays,
  Send,
  QrCode,
  BarChart3,
  Sparkles,
  Database,
  Gauge,
  Rocket,
  TrendingUp,
  UserCog,
  Server,
  FileOutput,
  ChevronRight,
  ShieldCheck,
  Lock,
  KeyRound,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { LandingHeader } from '@/components/layout/LandingHeader';

// ─── Data Constants ─────────────────────────────────────────────────────────

const ABOUT_CARDS = [
  { 
    icon: CalendarCheck, 
    title: 'Manajemen Event', 
    description: 'Kelola event end-to-end — konfigurasi, jadwal, kapasitas, dan siklus hidup dalam satu platform.' 
  },
  { 
    icon: TicketCheck, 
    title: 'Sistem Tiket', 
    description: 'Terbitkan dan lacak tiket, atur kuota, dan validasi kehadiran peserta.' 
  },
  { 
    icon: Users, 
    title: 'Database Kontak', 
    description: 'Import, normalisasi, dan kelola ribuan kontak dengan deteksi duplikat berbasis AI.' 
  },
  { 
    icon: Target, 
    title: 'Kontrol Operasional', 
    description: 'Monitor KPI, kelola workflow, dan pastikan efisiensi operasional event Anda.' 
  },
];

const MODULES = [
  { icon: CalendarDays, name: 'Manajemen Event', description: 'Buat, jadwalkan, dan kelola event dengan kontrol lifecycle penuh.', badge: 'Core' },
  { icon: Users, name: 'Database Kontak', description: 'Import, normalisasi, dan segmentasi ribuan kontak secara cerdas.', badge: 'Database' },
  { icon: Send, name: 'Blast & Notifikasi', description: 'Kirim undangan tersegmentasi via WhatsApp dan Email secara terjadwal.', badge: 'Blast' },
  { icon: QrCode, name: 'Check-in QR Code', description: 'Aplikasi check-in PWA offline — scan QR peserta cepat di hari-H.', badge: 'Scan' },
  { icon: BarChart3, name: 'Laporan & Analitik', description: 'Pantau kehadiran real-time, unduh Excel/PDF, dan visualisasi funnel.', badge: 'Analytics' },
  { icon: Sparkles, name: 'AI Insights', description: 'Insight otomatis pasca-event: ringkasan, normalisasi data, dan rekomendasi.', badge: 'AI' },
];

const STEPS = [
  { icon: Database, step: '01', title: 'Input Data', description: 'Setup event, konfigurasi sistem, dan input data operasional.' },
  { icon: Gauge, step: '02', title: 'Kelola & Monitor', description: 'Gunakan dashboard untuk mengawasi dan mengendalikan semua proses.' },
  { icon: Rocket, step: '03', title: 'Eksekusi', description: 'Jalankan operasi live dan pantau progres secara real-time.' },
  { icon: TrendingUp, step: '04', title: 'Analisis Hasil', description: 'Tinjau laporan dan analitik performa pasca-event.' },
];

const ARCH_NODES = [
  { icon: UserCog, label: 'Admin', sub: 'Internal Users' },
  { icon: Server, label: 'EM · U System', sub: 'Core Platform' },
  { icon: FileOutput, label: 'Output', sub: 'Event · Kontak · Laporan' },
];

const SECURITY_CARDS = [
  { icon: ShieldCheck, title: 'Akses Berbasis Peran', description: 'Hak akses ditetapkan per peran — super admin, staff, dan viewer dengan batasan yang jelas.' },
  { icon: Lock, title: 'Kontrol Level Admin', description: 'Setiap modul menerapkan kebijakan akses granular untuk mencegah tindakan yang tidak sah.' },
  { icon: KeyRound, title: 'Pengelolaan Data UU PDP', description: 'Semua data operasional ditangani dengan audit trail dan perlindungan sesuai UU PDP.' },
];

// ─── Main Component ─────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <LandingHeader />

      {/* HERO SECTION */}
      <section id="overview" className="relative overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="/hero-bg.png"
            alt=""
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-white/95 via-white/90 to-white/95" />
        </div>

        <div className="container relative px-5 py-20 md:py-32 lg:py-48 flex flex-col items-center justify-center min-h-[620px] md:min-h-[700px]">
          <div className="max-w-3xl text-center">
            {/* Label */}
            <div className="inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-xs font-medium tracking-wide bg-black/5 text-black border border-black/10 mb-6 md:mb-8">
              <Image 
                src="/icons/icon.jpg" 
                alt="Admin Portal" 
                width={16} 
                height={16} 
                className="rounded-full" 
              />
              Admin Portal
            </div>

            {/* Title */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tighter text-black leading-[1.05] mb-6">
              EM · U Admin
              <br />
              <span className="text-gray-400">Platform</span>
            </h1>

            {/* Description */}
            <p className="text-lg md:text-xl text-gray-600 leading-relaxed max-w-2xl mx-auto mb-6 px-2">
              Platform terpusat untuk mengelola event, peserta, dan operasional digital EM · U.
            </p>
            <p className="text-base text-gray-500 max-w-2xl mx-auto mb-10 px-2">
              Dibangun khusus untuk tim admin internal — kelola, monitor, dan kendalikan seluruh layanan EM · U dari satu dashboard.
            </p>

            {/* CTA Button */}
            <Button
              asChild
              size="lg"
              className="h-12 px-8 text-base font-semibold rounded-full bg-black hover:bg-gray-900 text-white shadow-xl shadow-black/25 border-0 w-full sm:w-auto"
            >
              <Link href="/login" className="flex items-center justify-center gap-2">
                Masuk ke Dashboard
                <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>

            {/* Stats - FIXED */}
            <div className="mt-16 md:mt-20 grid grid-cols-3 gap-8 md:gap-16">
              {[
                { value: '6', label: 'Core Modules' },
                { value: '24/7', label: 'System Uptime' },
                { value: 'Secure', label: 'Role-Based' },
              ].map((stat) => (
                <div 
                  key={stat.label} 
                  className="text-center"
                >
                  <div className="text-3xl md:text-4xl font-black text-black">
                    {stat.value}
                  </div>
                  <div className="text-sm text-gray-500 mt-1.5">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ABOUT SYSTEM */}
      <section className="py-16 md:py-24 lg:py-28">
        <div className="container px-5">
          <div className="max-w-xl mx-auto text-center mb-12 md:mb-16">
            <span className="section-label mb-4">Tentang Sistem</span>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              Apa yang menggerakkan{' '}
              <span className="gradient-text">EM · U Platform</span>
            </h2>
            <p className="mt-4 text-muted-foreground text-[15px] leading-relaxed">
              Platform internal yang dirancang untuk tim admin — kelola, monitor, dan kendalikan seluruh operasional.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {ABOUT_CARDS.map((card, index) => (
              <div
                key={index}
                className="group relative rounded-3xl border border-border/60 bg-card p-6 md:p-8 hover:shadow-xl transition-all duration-300"
              >
                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                  <card.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg">{card.title}</h3>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{card.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CORE MODULES */}
      <section id="sistem" className="py-16 md:py-24 lg:py-28 bg-surface">
        <div className="container px-5">
          <div className="max-w-xl mx-auto text-center mb-12 md:mb-16">
            <span className="section-label mb-4">Modul Utama</span>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              Semua yang Anda butuhkan,{' '}
              <span className="gradient-text">satu tempat</span>
            </h2>
            <p className="mt-4 text-muted-foreground text-[15px]">
              Enam modul terintegrasi yang menggerakkan ekosistem EM · U.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {MODULES.map((mod, index) => (
              <div
                key={index}
                className="group rounded-3xl border border-border/60 bg-card p-6 md:p-8 hover:shadow-xl transition-all duration-300"
              >
                <div className="flex items-start justify-between mb-6">
                  <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <mod.icon className="h-6 w-6 text-primary" />
                  </div>
                  <Badge variant="secondary" className="text-xs font-semibold px-3 py-1">
                    {mod.badge}
                  </Badge>
                </div>
                <h3 className="font-semibold text-lg mb-2">{mod.name}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{mod.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="workflow" className="py-16 md:py-24 lg:py-28">
        <div className="container px-5">
          <div className="max-w-xl mx-auto text-center mb-12 md:mb-16">
            <span className="section-label mb-4">Workflow</span>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              Bagaimana sistem{' '}
              <span className="gradient-text">bekerja</span>
            </h2>
            <p className="mt-4 text-muted-foreground text-[15px]">
              Alur kerja empat langkah — dari input data hingga insight yang actionable.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-6 relative">
            <div className="hidden md:block absolute top-9 left-1/4 right-1/4 h-[3px] bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

            {STEPS.map((s, index) => (
              <div key={index} className="relative text-center group">
                <div className="mx-auto h-20 w-20 rounded-3xl bg-card border-2 border-primary/20 flex items-center justify-center mb-6 shadow-sm group-hover:border-primary/40 transition-colors">
                  <s.icon className="h-8 w-8 text-primary" />
                </div>

                <div className="font-mono text-xs font-medium text-primary tracking-[3px] mb-2">STEP {s.step}</div>
                <h3 className="font-bold text-xl mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-[240px] mx-auto">
                  {s.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ARCHITECTURE */}
      <section className="py-16 md:py-24 lg:py-28 bg-surface">
        <div className="container px-5">
          <div className="max-w-xl mx-auto text-center mb-12 md:mb-16">
            <span className="section-label mb-4">Arsitektur</span>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              Arsitektur{' '}
              <span className="gradient-text">sistem</span>
            </h2>
            <p className="mt-4 text-muted-foreground text-[15px]">
              Gambaran sederhana bagaimana data mengalir melalui platform.
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-4">
              {ARCH_NODES.map((node, i) => (
                <div key={i} className="flex items-center w-full md:w-auto">
                  <div className="rounded-3xl border border-border/60 bg-card p-8 text-center flex-1 md:min-w-[200px] card-elevated">
                    <div className="h-16 w-16 mx-auto mb-5 rounded-2xl bg-primary/10 flex items-center justify-center">
                      <node.icon className="h-7 w-7 text-primary" />
                    </div>
                    <h3 className="font-bold text-xl">{node.label}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{node.sub}</p>
                  </div>

                  {i < ARCH_NODES.length - 1 && (
                    <div className="hidden md:block mx-4">
                      <ChevronRight className="h-6 w-6 text-primary/40" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SECURITY */}
      <section id="akses" className="py-16 md:py-24 lg:py-28">
        <div className="container px-5">
          <div className="max-w-xl mx-auto text-center mb-12 md:mb-16">
            <span className="section-label mb-4">Keamanan</span>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              Akses &amp;{' '}
              <span className="gradient-text">Keamanan</span>
            </h2>
            <p className="mt-4 text-muted-foreground text-[15px]">
              Langkah-langkah keamanan bawaan untuk melindungi operasional dan integritas data.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {SECURITY_CARDS.map((item, index) => (
              <div
                key={index}
                className="rounded-3xl border border-border/60 bg-card p-8 text-center hover:shadow-xl transition-all"
              >
                <div className="h-16 w-16 mx-auto mb-6 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <item.icon className="h-7 w-7 text-primary" />
                </div>
                <h3 className="font-semibold text-xl mb-3">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-gray-200 bg-white py-12">
        <div className="container px-5">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-black/10 flex items-center justify-center">
                <Image 
                  src="/icons/icon.jpg" 
                  alt="EM · U" 
                  width={24} 
                  height={24} 
                  className="rounded" 
                />
              </div>
              <div>
                <span className="text-lg font-bold text-foreground">EM · U Communication</span>
                <p className="text-xs text-muted-foreground">Admin Platform</p>
              </div>
            </div>

            <nav className="flex flex-wrap justify-center gap-x-8 gap-y-2 text-sm">
              {['Overview', 'Sistem', 'Workflow', 'Keamanan'].map((item, i) => (
                <a
                  key={i}
                  href={['#overview', '#sistem', '#workflow', '#akses'][i]}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {item}
                </a>
              ))}
            </nav>
          </div>

          <Separator className="my-10" />

          <div className="flex flex-col md:flex-row items-center justify-between text-sm text-muted-foreground gap-4">
            <p>© {new Date().getFullYear()} EM · U Communication. All rights reserved.</p>
            <Link href="/data-rights" className="hover:text-foreground underline">
              Hak Data Anda
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}