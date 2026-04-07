'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useEvents } from '@/hooks/useEvents'
import { useAuthStore } from '@/store/authStore'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import type { Contact } from '@/types/api'

function useTotalContacts() {
  return useQuery<{ pagination: { total: number } }>({
    queryKey: ['contacts', 'summary'],
    queryFn: () => fetch('/api/contacts?pageSize=1').then((r) => r.json()),
  })
}

function useContactsDemographics() {
  return useQuery<{ data: Contact[] }>({
    queryKey: ['contacts', 'demographics'],
    queryFn: () => fetch('/api/contacts?pageSize=250').then((r) => r.json()),
    staleTime: 5 * 60 * 1000,
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

export function ViewerDashboard() {
  const { data: currentUser, isLoading: userLoading } = useCurrentUser()
  const { data: eventsData, isLoading: eventsLoading } = useEvents()
  const { data: contactsData, isLoading: contactsLoading } = useTotalContacts()
  const { data: demoData, isLoading: demoLoading } = useContactsDemographics()

  const authUser = useAuthStore((s) => s.user)
  const isLoading = userLoading || eventsLoading || contactsLoading

  const totalEvents = eventsData?.pagination?.total ?? eventsData?.data?.length ?? 0
  const activeEvents = eventsData?.data?.filter((e) => e.status === 'active').length ?? 0
  const completedEvents = eventsData?.data?.filter((e) => e.status === 'completed').length ?? 0
  const totalContacts = contactsData?.pagination?.total ?? 0
  const recentEvents = [...(eventsData?.data ?? [])]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)

  // Audience demographics — top 5 industries
  const industryBreakdown = useMemo(() => {
    if (!demoData?.data) return []
    const counts: Record<string, number> = {}
    for (const c of demoData.data) {
      const industry = c.serviceType || 'Lainnya'
      counts[industry] = (counts[industry] || 0) + 1
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
  }, [demoData])

  const maxIndustryCount = industryBreakdown[0]?.[1] ?? 1

  // Mock funnel data (registrations → approved → attended)
  const funnelData = useMemo(() => {
    const registered = 180
    const approved = 142
    const attended = 98
    return [
      { label: 'Registrasi', value: registered },
      { label: 'Disetujui', value: approved },
      { label: 'Hadir', value: attended },
    ]
  }, [])

  const maxFunnel = funnelData[0]?.value ?? 1

  const greeting = currentUser?.name ?? authUser?.name ?? 'Viewer'

  return (
    <div className="space-y-6">
      {/* Greeting */}
      {userLoading ? (
        <Skeleton className="h-8 w-64" />
      ) : (
        <h1 className="text-2xl font-bold">Selamat datang, {greeting}!</h1>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))
        ) : (
          <>
            <StatCard label="Total Event" value={totalEvents} />
            <StatCard label="Event Aktif" value={activeEvents} />
            <StatCard label="Total Kontak" value={totalContacts} />
            <StatCard label="Event Selesai" value={completedEvents} />
          </>
        )}
      </div>

      {/* Insights row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Event Funnel */}
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold mb-3">Funnel Event (Agregat)</h3>
          <div className="space-y-3">
            {funnelData.map((item) => (
              <div key={item.label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="font-medium">{item.value}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${(item.value / maxFunnel) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">
            Konversi: {Math.round((funnelData[2].value / funnelData[0].value) * 100)}% (registrasi → hadir)
          </p>
        </div>

        {/* Audience Demographics */}
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold mb-3">Demografi Audiens — Top 5 Industri</h3>
          {demoLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-6 rounded" />
              ))}
            </div>
          ) : (
            <div className="space-y-2.5">
              {industryBreakdown.map(([industry, count]) => (
                <div key={industry}>
                  <div className="flex justify-between text-xs mb-0.5">
                    <span className="text-muted-foreground truncate mr-2">{industry}</span>
                    <span className="font-medium shrink-0">{count}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all"
                      style={{ width: `${(count / maxIndustryCount) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent events table */}
      <div>
        <h2 className="text-base font-semibold mb-3">Event Terbaru</h2>
        {eventsLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Nama</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Tanggal</th>
                </tr>
              </thead>
              <tbody>
                {recentEvents.map((event) => (
                  <tr key={event.id} className="border-t border-border">
                    <td className="px-4 py-3 font-medium">{event.name}</td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_VARIANTS[event.status] ?? 'outline'}>
                        {STATUS_LABELS[event.status] ?? event.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                      {new Date(event.eventDate).toLocaleDateString('id-ID')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, note }: { label: string; value: number; note?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
      {note && <p className="text-xs text-muted-foreground">{note}</p>}
    </div>
  )
}
