'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import {
  Calendar, Zap, Users, Clock,
  CalendarDays, TrendingUp, ArrowUpRight,
  Upload, Plus,
} from 'lucide-react'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useEvents } from '@/hooks/useEvents'
import { useAuthStore } from '@/store/authStore'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatIndonesianDate } from '@/lib/dateUtils'

function useTotalContacts() {
  return useQuery<{ pagination: { total: number } }>({
    queryKey: ['contacts', 'summary'],
    queryFn: () => fetch('/api/contacts?pageSize=1').then((r) => r.json()),
  })
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  published: 'Dipublikasi',
  active: 'Aktif',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
  archived: 'Diarsipkan',
}

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  draft: 'outline',
  published: 'secondary',
  active: 'default',
  completed: 'secondary',
  cancelled: 'destructive',
  archived: 'outline',
}

export function AdminDashboard() {
  const { data: currentUser, isLoading: userLoading } = useCurrentUser()
  const { data: eventsData, isLoading: eventsLoading } = useEvents()
  const { data: contactsData, isLoading: contactsLoading } = useTotalContacts()

  const accessToken = useAuthStore((s) => s.accessToken)
  const isLoading = userLoading || eventsLoading || contactsLoading

  const allEvents = eventsData?.data ?? []
  const totalEvents   = eventsData?.pagination?.total ?? allEvents.length
  const activeEvents  = allEvents.filter((e) => e.status === 'active').length
  const draftEvents   = allEvents.filter((e) => e.status === 'draft').length
  const doneEvents    = allEvents.filter((e) => e.status === 'completed').length
  const totalContacts = contactsData?.pagination?.total ?? 0
  const pendingRegistrations = 42

  const recentEvents = [...allEvents]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 8)

  const greeting = currentUser?.name ?? accessToken ?? 'Admin'
  const today = formatIndonesianDate(new Date())

  const STAT_PILLS = [
    { icon: Calendar,  label: 'Total Event',        value: totalEvents,          sub: 'semua event'        },
    { icon: Zap,       label: 'Event Aktif',         value: activeEvents,         sub: 'sedang berjalan'    },
    { icon: Users,     label: 'Total Kontak',        value: totalContacts,        sub: 'dalam database'     },
    { icon: Clock,     label: 'Registrasi Pending',  value: pendingRegistrations, sub: 'menunggu approval'  },
  ]

  // Pipeline funnel from real event counts
  const PIPELINE = [
    { label: 'Draft',       value: draftEvents,  pct: totalEvents ? Math.round(draftEvents  / totalEvents * 100) : 0,  color: 'bg-muted-foreground/40' },
    { label: 'Aktif',       value: activeEvents, pct: totalEvents ? Math.round(activeEvents / totalEvents * 100) : 0,  color: 'bg-primary'             },
    { label: 'Selesai',     value: doneEvents,   pct: totalEvents ? Math.round(doneEvents   / totalEvents * 100) : 0,  color: 'bg-emerald-500'         },
    { label: 'Pending Reg', value: pendingRegistrations, pct: activeEvents ? Math.round(Math.min(pendingRegistrations / (activeEvents * 20 || 1), 1) * 100) : 0, color: 'bg-amber-400' },
  ]

  return (
    <div className="space-y-5">
      {/* Greeting */}
      {userLoading ? (
        <div className="space-y-1">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-7 w-64" />
        </div>
      ) : (
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">{today}</p>
          <h1 className="text-2xl font-bold tracking-tight leading-tight">
            Selamat datang, {greeting}!
          </h1>
        </div>
      )}

      {/* Stats strip */}
      {isLoading ? (
        <Skeleton className="h-[88px] rounded-xl" />
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-border">
            {STAT_PILLS.map((pill) => (
              <div key={pill.label} className="flex items-center gap-3.5 px-5 py-5">
                <div className="icon-container h-10 w-10 shrink-0">
                  <pill.icon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <div className="text-xl font-bold text-foreground leading-none">{pill.value}</div>
                  <div className="text-xs font-medium text-foreground mt-1">{pill.label}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">{pill.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main two-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_288px] gap-5 items-start">

        {/* ── LEFT: Events table ── */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <span className="text-[15px] font-bold text-foreground">Event Terbaru</span>
            </div>
            <Link
              href="/app/events"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Lihat Semua
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>

          {eventsLoading ? (
            <div className="p-5 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 rounded-lg" />
              ))}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  <th className="text-left px-5 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Nama Event
                  </th>
                  <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">
                    Tanggal
                  </th>
                  <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {recentEvents.map((event) => (
                  <tr
                    key={event.id}
                    className="hover:bg-muted/30 transition-colors cursor-pointer group"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/8 border border-primary/15 shrink-0 group-hover:bg-primary/12 transition-colors">
                          <CalendarDays className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium text-foreground text-[13.5px] leading-snug">
                            {event.name}
                          </div>
                          <div className="text-[11px] text-muted-foreground mt-0.5 sm:hidden">
                            {new Date(event.eventDate).toLocaleDateString('id-ID')}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-[13px] text-muted-foreground hidden sm:table-cell whitespace-nowrap">
                      {new Date(event.eventDate).toLocaleDateString('id-ID', {
                        day: 'numeric', month: 'short', year: 'numeric'
                      })}
                    </td>
                    <td className="px-4 py-4">
                      <Badge
                        variant={STATUS_VARIANTS[event.status] ?? 'outline'}
                        className="text-[11px] px-2.5 py-0.5"
                      >
                        {STATUS_LABELS[event.status] ?? event.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ── RIGHT sidebar ── */}
        <div className="space-y-4">

          {/* Quick actions */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <span className="text-[14px] font-bold text-foreground">Aksi Cepat</span>
            </div>
            <div className="p-3 space-y-2">
              <Button asChild className="w-full justify-start gap-2.5 h-9 text-[13px]">
                <Link href="/app/events">
                  <Plus className="h-3.5 w-3.5" />
                  Buat Event Baru
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start gap-2.5 h-9 text-[13px]">
                <Link href="/app/contacts/upload">
                  <Upload className="h-3.5 w-3.5" />
                  Upload Kontak
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start gap-2.5 h-9 text-[13px]">
                <Link href="/app/events">
                  <TrendingUp className="h-3.5 w-3.5" />
                  Lihat Laporan
                </Link>
              </Button>
            </div>
          </div>

          {/* Pipeline funnel */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-[14px] font-bold text-foreground">Pipeline Event</span>
            </div>
            {isLoading ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-9 rounded" />
                ))}
              </div>
            ) : (
              <div className="p-4 space-y-3.5">
                {PIPELINE.map((f) => (
                  <div key={f.label}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[12px] text-muted-foreground">{f.label}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[12px] font-semibold text-foreground">{f.value}</span>
                        <span className="text-[11px] text-muted-foreground">{f.pct}%</span>
                      </div>
                    </div>
                    <div className="h-[5px] bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${f.color}`}
                        style={{ width: `${Math.max(f.pct, f.value > 0 ? 4 : 0)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
