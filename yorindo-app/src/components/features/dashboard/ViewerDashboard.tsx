'use client'

import { useQuery } from '@tanstack/react-query'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useEvents } from '@/hooks/useEvents'
import { useAuthStore } from '@/store/authStore'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

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

export function ViewerDashboard() {
  const { data: currentUser, isLoading: userLoading } = useCurrentUser()
  const { data: eventsData, isLoading: eventsLoading } = useEvents()
  const { data: contactsData, isLoading: contactsLoading } = useTotalContacts()

  const accessToken = useAuthStore((s) => s.accessToken)
  const isLoading = userLoading || eventsLoading || contactsLoading

  const totalEvents = eventsData?.pagination?.total ?? eventsData?.data?.length ?? 0
  const activeEvents = eventsData?.data?.filter((e) => e.status === 'active').length ?? 0
  const totalContacts = contactsData?.pagination?.total ?? 0
  const pendingRegistrations = 42

  const recentEvents = [...(eventsData?.data ?? [])]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)

  const greeting = currentUser?.name ?? accessToken ?? 'Viewer'

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
            <StatCard label="Registrasi Pending" value={pendingRegistrations} note="(mock)" />
          </>
        )}
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
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Tanggal</th>
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
                    <td className="px-4 py-3 text-muted-foreground">
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
