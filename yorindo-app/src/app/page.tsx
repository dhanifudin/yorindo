import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowRight, Shield,
  CalendarCheck, TicketCheck, Users, Target,
  CalendarDays, Send, QrCode, BarChart3, Sparkles,
  Database, Gauge, Rocket, TrendingUp,
  UserCog, Server, FileOutput, ChevronRight,
  ShieldCheck, Lock, KeyRound,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { LandingHeader } from '@/components/layout/LandingHeader'

// ─── About System ───────────────────────────────────────────────────────────

const ABOUT_CARDS = [
  { icon: CalendarCheck, title: 'Manajemen Event',      description: 'Kelola event end-to-end — konfigurasi, jadwal, kapasitas, dan siklus hidup dalam satu platform.' },
  { icon: TicketCheck,   title: 'Sistem Tiket',         description: 'Terbitkan dan lacak tiket, atur kuota, dan validasi kehadiran peserta.' },
  { icon: Users,         title: 'Database Kontak',      description: 'Import, normalisasi, dan kelola ribuan kontak dengan deteksi duplikat berbasis AI.' },
  { icon: Target,        title: 'Kontrol Operasional',  description: 'Monitor KPI, kelola workflow, dan pastikan efisiensi operasional event Anda.' },
]

// ─── Core Modules ────────────────────────────────────────────────────────────

const MODULES = [
  { icon: CalendarDays, name: 'Manajemen Event',     description: 'Buat, jadwalkan, dan kelola event dengan kontrol lifecycle penuh.',         badge: 'Core'      },
  { icon: Users,        name: 'Database Kontak',     description: 'Import, normalisasi, dan segmentasi ribuan kontak secara cerdas.',           badge: 'Database'  },
  { icon: Send,         name: 'Blast & Notifikasi',  description: 'Kirim undangan tersegmentasi via WhatsApp dan Email secara terjadwal.',      badge: 'Blast'     },
  { icon: QrCode,       name: 'Check-in QR Code',    description: 'Aplikasi check-in PWA offline — scan QR peserta cepat di hari-H.',          badge: 'Scan'      },
  { icon: BarChart3,    name: 'Laporan & Analitik',  description: 'Pantau kehadiran real-time, unduh Excel/PDF, dan visualisasi funnel.',       badge: 'Analytics' },
  { icon: Sparkles,     name: 'YoriMind AI',          description: 'Insight otomatis pasca-event: ringkasan, normalisasi data, dan rekomendasi.', badge: 'AI'        },
]

// ─── How It Works ─────────────────────────────────────────────────────────────

const STEPS = [
  { icon: Database,   step: '01', title: 'Input Data',        description: 'Setup event, konfigurasi sistem, dan input data operasional.' },
  { icon: Gauge,      step: '02', title: 'Kelola & Monitor',  description: 'Gunakan dashboard untuk mengawasi dan mengendalikan semua proses.' },
  { icon: Rocket,     step: '03', title: 'Eksekusi',          description: 'Jalankan operasi live dan pantau progres secara real-time.' },
  { icon: TrendingUp, step: '04', title: 'Analisis Hasil',    description: 'Tinjau laporan dan analitik performa pasca-event.' },
]

// ─── Architecture ────────────────────────────────────────────────────────────

const ARCH_NODES = [
  { icon: UserCog,    label: 'Admin',          sub: 'Internal Users'            },
  { icon: Server,     label: 'Yorindo System', sub: 'Core Platform'             },
  { icon: FileOutput, label: 'Output',         sub: 'Event · Kontak · Laporan' },
]

// ─── Access & Security ───────────────────────────────────────────────────────

const SECURITY_CARDS = [
  { icon: ShieldCheck, title: 'Akses Berbasis Peran',    description: 'Hak akses ditetapkan per peran — super admin, staff, dan viewer dengan batasan yang jelas.' },
  { icon: Lock,        title: 'Kontrol Level Admin',     description: 'Setiap modul menerapkan kebijakan akses granular untuk mencegah tindakan yang tidak sah.' },
  { icon: KeyRound,    title: 'Pengelolaan Data UU PDP', description: 'Semua data operasional ditangani dengan audit trail dan perlindungan sesuai UU PDP.' },
]

// ─── Page ────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <LandingHeader />

      {/* ── HERO ── */}
      <section id="overview" className="relative overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0">
          <Image src="/hero-bg.png" alt="" fill className="object-cover" priority />
          <div className="absolute inset-0 bg-black/60" />
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(135deg, hsl(217 73% 35% / 0.45) 0%, hsl(217 65% 20% / 0.6) 100%)' }}
          />
        </div>

        <div className="container relative py-24 md:py-36">
          <div className="max-w-2xl">
            {/* Label */}
            <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold tracking-wide uppercase bg-white/10 text-white border border-white/20 mb-6 backdrop-blur">
              <Shield className="h-3.5 w-3.5" />
              Internal Admin Platform
            </div>

            {/* Title */}
            <h1 className="text-4xl md:text-[56px] font-extrabold tracking-tight text-white leading-[1.1] text-balance">
              Yorindo Admin{' '}
              <span className="bg-gradient-to-r from-blue-300 to-blue-500 bg-clip-text text-transparent">
                Platform
              </span>
            </h1>

            {/* Desc */}
            <p className="mt-5 text-lg md:text-xl text-white/80 leading-relaxed max-w-lg">
              Platform terpusat untuk mengelola event, peserta, dan operasional digital Yorindo.
            </p>
            <p className="mt-3 text-sm text-white/60 max-w-md leading-relaxed">
              Dibangun untuk tim admin internal — kelola, monitor, dan kendalikan seluruh layanan Yorindo dari satu dashboard.
            </p>

            {/* CTA */}
            <div className="mt-8">
              <Button
                asChild
                size="lg"
                className="h-12 px-7 text-sm font-semibold gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white shadow-lg shadow-blue-900/30 border-0"
              >
                <Link href="/login">
                  Masuk ke Dashboard
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>

            {/* Stats */}
            <div className="mt-14 flex items-center gap-10 md:gap-14">
              {[
                { value: '6',      label: 'Core Modules'   },
                { value: '24/7',   label: 'System Uptime'  },
                { value: 'Secure', label: 'Role-Based'     },
              ].map((stat) => (
                <div key={stat.label}>
                  <div className="text-2xl font-bold text-white">{stat.value}</div>
                  <div className="text-xs text-white/50 mt-0.5">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── ABOUT SYSTEM ── */}
      <section className="py-20 md:py-28">
        <div className="container">
          <div className="max-w-xl mx-auto text-center mb-14">
            <span className="section-label mb-4">Tentang Sistem</span>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mt-4 tracking-tight">
              Apa yang menggerakkan{' '}
              <span className="gradient-text">Yorindo</span>
            </h2>
            <p className="mt-4 text-muted-foreground text-[15px] leading-relaxed">
              Platform internal yang dirancang untuk tim admin — kelola, monitor, dan kendalikan seluruh operasional.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {ABOUT_CARDS.map((card) => (
              <div
                key={card.title}
                className="group relative rounded-2xl border border-border/60 bg-card p-6 card-elevated"
              >
                <div className="icon-container h-11 w-11 mb-5">
                  <card.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground text-[15px]">{card.title}</h3>
                <p className="mt-2 text-[13px] text-muted-foreground leading-relaxed">{card.description}</p>
                <div className="absolute bottom-0 left-6 right-6 h-[2px] rounded-full bg-primary/0 group-hover:bg-primary/40 transition-all duration-300" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CORE MODULES ── */}
      <section id="sistem" className="py-20 md:py-28 bg-surface">
        <div className="container">
          <div className="max-w-xl mx-auto text-center mb-14">
            <span className="section-label mb-4">Modul Utama</span>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mt-4 tracking-tight">
              Semua yang Anda butuhkan,{' '}
              <span className="gradient-text">satu tempat</span>
            </h2>
            <p className="mt-4 text-muted-foreground text-[15px] leading-relaxed">
              Enam modul terintegrasi yang menggerakkan ekosistem admin Yorindo.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {MODULES.map((mod) => (
              <div
                key={mod.name}
                className="group relative rounded-2xl border border-border/60 bg-card p-6 card-elevated"
              >
                <div className="flex items-start justify-between mb-5">
                  <div className="icon-container h-12 w-12">
                    <mod.icon className="h-5 w-5 text-primary" />
                  </div>
                  <Badge
                    variant="secondary"
                    className="text-[10px] font-semibold uppercase tracking-wider rounded-md px-2 py-0.5"
                  >
                    {mod.badge}
                  </Badge>
                </div>
                <h3 className="font-semibold text-foreground text-[15px]">{mod.name}</h3>
                <p className="mt-2 text-[13px] text-muted-foreground leading-relaxed">{mod.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="workflow" className="py-20 md:py-28">
        <div className="container">
          <div className="max-w-xl mx-auto text-center mb-16">
            <span className="section-label mb-4">Workflow</span>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mt-4 tracking-tight">
              Bagaimana sistem{' '}
              <span className="gradient-text">bekerja</span>
            </h2>
            <p className="mt-4 text-muted-foreground text-[15px] leading-relaxed">
              Alur kerja empat langkah — dari input data hingga insight yang actionable.
            </p>
          </div>

          <div className="relative">
            {/* Connector line (desktop) */}
            <div className="hidden md:block absolute top-[52px] left-[12%] right-[12%] step-connector" />

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-6">
              {STEPS.map((s) => (
                <div key={s.step} className="relative text-center">
                  <div className="relative z-10 mx-auto h-[72px] w-[72px] rounded-2xl bg-card border-2 border-primary/20 flex items-center justify-center mb-5 shadow-sm">
                    <s.icon className="h-7 w-7 text-primary" />
                  </div>
                  <span className="font-mono text-xs font-medium text-primary tracking-widest">
                    STEP {s.step}
                  </span>
                  <h3 className="mt-2 font-bold text-foreground text-base">{s.title}</h3>
                  <p className="mt-2 text-[13px] text-muted-foreground leading-relaxed max-w-[200px] mx-auto">
                    {s.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── ARCHITECTURE ── */}
      <section className="py-20 md:py-28 bg-surface">
        <div className="container">
          <div className="max-w-xl mx-auto text-center mb-14">
            <span className="section-label mb-4">Arsitektur</span>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mt-4 tracking-tight">
              Arsitektur{' '}
              <span className="gradient-text">sistem</span>
            </h2>
            <p className="mt-4 text-muted-foreground text-[15px] leading-relaxed">
              Gambaran sederhana bagaimana data mengalir melalui platform.
            </p>
          </div>

          <div className="max-w-3xl mx-auto">
            <div className="flex flex-col md:flex-row items-center justify-center gap-3 md:gap-0">
              {ARCH_NODES.map((node, i) => (
                <div key={node.label} className="flex items-center gap-3">
                  <div className="rounded-2xl border border-border/60 bg-card p-7 md:p-8 text-center min-w-[180px] card-elevated">
                    <div className="icon-container h-14 w-14 mx-auto mb-4">
                      <node.icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-bold text-foreground text-base">{node.label}</h3>
                    <p className="text-[12px] text-muted-foreground mt-1.5 font-medium">{node.sub}</p>
                  </div>
                  {i < ARCH_NODES.length - 1 && (
                    <>
                      <div className="hidden md:flex items-center justify-center w-12">
                        <div className="flex items-center gap-0.5">
                          <div className="h-[2px] w-6 bg-primary/30 rounded-full" />
                          <ChevronRight className="h-4 w-4 text-primary/50" />
                        </div>
                      </div>
                      <div className="md:hidden flex flex-col items-center py-1">
                        <div className="w-[2px] h-4 bg-primary/30 rounded-full" />
                        <ChevronRight className="h-4 w-4 text-primary/50 rotate-90" />
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── ACCESS & SECURITY ── */}
      <section id="akses" className="py-20 md:py-28">
        <div className="container">
          <div className="max-w-xl mx-auto text-center mb-14">
            <span className="section-label mb-4">Keamanan</span>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mt-4 tracking-tight">
              Akses &{' '}
              <span className="gradient-text">Keamanan</span>
            </h2>
            <p className="mt-4 text-muted-foreground text-[15px] leading-relaxed">
              Langkah-langkah keamanan bawaan untuk melindungi operasional dan integritas data.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {SECURITY_CARDS.map((item) => (
              <div
                key={item.title}
                className="group rounded-2xl border border-border/60 bg-card p-6 card-elevated text-center"
              >
                <div className="icon-container h-14 w-14 mx-auto mb-5">
                  <item.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground text-[15px]">{item.title}</h3>
                <p className="mt-2 text-[13px] text-muted-foreground leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t bg-card/50 py-12">
        <div className="container">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-full bg-primary/10 ring-2 ring-primary/20">
                <Shield className="h-4 w-4 text-primary" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-foreground">Yorindo Communication</span>
                <span className="text-[10px] text-muted-foreground">Admin Platform</span>
              </div>
            </div>

            {/* Nav */}
            <nav className="flex items-center gap-8">
              {['Overview', 'Sistem', 'Workflow', 'Keamanan'].map((item, i) => {
                const hrefs = ['#overview', '#sistem', '#workflow', '#akses']
                return (
                  <a
                    key={item}
                    href={hrefs[i]}
                    className="text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {item}
                  </a>
                )
              })}
            </nav>
          </div>

          <Separator className="my-8" />

          <div className="flex flex-col md:flex-row items-center justify-between text-[12px] text-muted-foreground gap-2">
            <p>© {new Date().getFullYear()} Yorindo Communication. All rights reserved.</p>
            <Link href="/data-rights" className="hover:text-foreground transition-colors underline">
              Hak Data Anda
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
