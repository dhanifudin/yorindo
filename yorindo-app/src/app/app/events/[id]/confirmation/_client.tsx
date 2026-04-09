'use client'

import { use, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { TablePagination } from '@/components/ui/table-pagination'
import { Mail, Send } from 'lucide-react'

const PAGE_SIZE = 20

interface ConfirmationPageProps {
  params: Promise<{ id: string }>
}

interface ApprovedRegistration {
  id: string
  contactName: string
  contactEmail: string
  contactCompany: string
  ticketToken: string | null
  approvedAt: string
}

export default function ConfirmationPage({ params }: ConfirmationPageProps) {
  const { id } = use(params)
  const queryClient = useQueryClient()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const { data, isLoading } = useQuery<{ data: ApprovedRegistration[]; pagination: { total: number } }>({
    queryKey: ['event-registrations', id, 'approved'],
    queryFn: () =>
      fetch(`/api/registrations?eventId=${id}&status=approved&pageSize=500`).then((r) => r.json()),
    staleTime: 30_000,
  })

  const sendTicketMutation = useMutation({
    mutationFn: async (regId: string) => {
      const res = await fetch(`/api/registrations/${regId}/resend-ticket`, { method: 'POST' })
      if (!res.ok) throw new Error('Gagal mengirim tiket')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Tiket dikirim ke email peserta', { duration: 4000 })
      queryClient.invalidateQueries({ queryKey: ['event-registrations', id, 'approved'] })
    },
    onError: () => toast.error('Gagal mengirim tiket'),
  })

  const sendBulkTicketsMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const results = await Promise.allSettled(
        ids.map((id) =>
          fetch(`/api/registrations/${id}/resend-ticket`, { method: 'POST' }).then((r) => {
            if (!r.ok) throw new Error('Failed')
            return r.json()
          })
        )
      )
      const succeeded = results.filter((r) => r.status === 'fulfilled').length
      const failed = results.filter((r) => r.status === 'rejected').length
      return { succeeded, failed }
    },
    onSuccess: (data) => {
      toast.success(`${data.succeeded} tiket terkirim${data.failed > 0 ? `, ${data.failed} gagal` : ''}`, { duration: 4000 })
      queryClient.invalidateQueries({ queryKey: ['event-registrations', id, 'approved'] })
      setSelectedIds(new Set())
    },
    onError: () => toast.error('Gagal mengirim tiket bulk'),
  })

  const registrations = data?.data ?? []
  const ticketSentCount = registrations.filter((r) => r.ticketToken).length
  const ticketPendingCount = registrations.filter((r) => !r.ticketToken).length

  const handleSelectAll = () => {
    if (selectedIds.size === ticketPendingCount) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(registrations.filter((r) => !r.ticketToken).map((r) => r.id)))
    }
  }

  const handleSelect = (regId: string) => {
    const next = new Set(selectedIds)
    if (next.has(regId)) {
      next.delete(regId)
    } else {
      next.add(regId)
    }
    setSelectedIds(next)
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{registrations.length}</div>
            <p className="text-sm text-muted-foreground">Peserta Disetujui</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{ticketSentCount}</div>
            <p className="text-sm text-muted-foreground">Tiket Terkirim</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-amber-600">{ticketPendingCount}</div>
            <p className="text-sm text-muted-foreground">Belum Dikirim</p>
          </CardContent>
        </Card>
      </div>

      {/* Bulk action bar */}
      {ticketPendingCount > 0 && (
        <Card>
          <CardContent className="pt-4 pb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={selectedIds.size === ticketPendingCount && ticketPendingCount > 0}
                onChange={handleSelectAll}
                className="accent-primary h-4 w-4 rounded"
              />
              <span className="text-sm">
                {selectedIds.size > 0
                  ? `${selectedIds.size} dari ${ticketPendingCount} peserta dipilih`
                  : `Pilih peserta yang belum menerima tiket`}
              </span>
            </div>
            <Button
              size="sm"
              onClick={() => sendBulkTicketsMutation.mutate(Array.from(selectedIds))}
              disabled={selectedIds.size === 0 || sendBulkTicketsMutation.isPending}
            >
              <Send className="h-4 w-4 mr-1" />
              {sendBulkTicketsMutation.isPending ? 'Mengirim...' : `Kirim ${selectedIds.size || ticketPendingCount} Tiket`}
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : registrations.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Belum ada peserta yang disetujui.
            </div>
          ) : (
            <ApprovedRegistrationsTable
              registrations={registrations}
              selectedIds={selectedIds}
              onSelect={handleSelect}
              onSendTicket={(regId) => sendTicketMutation.mutate(regId)}
              isPending={sendTicketMutation.isPending}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

interface ApprovedRegistrationsTableProps {
  registrations: ApprovedRegistration[]
  selectedIds: Set<string>
  onSelect: (id: string) => void
  onSendTicket: (id: string) => void
  isPending: boolean
}

function ApprovedRegistrationsTable({ registrations, selectedIds, onSelect, onSendTicket, isPending }: ApprovedRegistrationsTableProps) {
  const [page, setPage] = useState(0)

  const pagedRegs = registrations.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10"></TableHead>
            <TableHead>Peserta</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Tiket</TableHead>
            <TableHead>Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pagedRegs.map((reg) => (
            <TableRow key={reg.id} className={!reg.ticketToken ? 'bg-amber-50/50' : ''}>
              <TableCell>
                {!reg.ticketToken && (
                  <input
                    type="checkbox"
                    checked={selectedIds.has(reg.id)}
                    onChange={() => onSelect(reg.id)}
                    className="accent-primary h-4 w-4 rounded"
                  />
                )}
              </TableCell>
              <TableCell>
                <div>
                  <p className="text-sm font-medium">{reg.contactName}</p>
                  <p className="text-xs text-muted-foreground">{reg.contactCompany || '—'}</p>
                </div>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {reg.contactEmail || '—'}
              </TableCell>
              <TableCell>
                {reg.ticketToken ? (
                  <Badge variant="default">Terkirim</Badge>
                ) : (
                  <Badge variant="secondary">Belum</Badge>
                )}
              </TableCell>
              <TableCell>
                {reg.ticketToken ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => onSendTicket(reg.id)}
                    disabled={isPending}
                  >
                    <Mail className="h-3 w-3 mr-1" />
                    Kirim Ulang
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => onSendTicket(reg.id)}
                    disabled={isPending}
                  >
                    <Send className="h-3 w-3 mr-1" />
                    Kirim Tiket
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <TablePagination
        page={page}
        pageSize={PAGE_SIZE}
        total={registrations.length}
        onPrev={() => setPage((p) => Math.max(0, p - 1))}
        onNext={() => setPage((p) => p + 1)}
        onPageChange={(p) => setPage(p)}
      />
    </>
  )
}
