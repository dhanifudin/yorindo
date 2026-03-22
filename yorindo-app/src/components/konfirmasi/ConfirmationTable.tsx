'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { TablePagination } from '@/components/ui/table-pagination'
import { Mail, MessageCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 20

export interface ConfirmationRegistration {
  id: string
  contact: { name: string; company: string }
  channel: 'whatsapp' | 'email'
  ticketSentAt: string | null
  confirmationStatus: 'confirmed' | 'pending' | 'waitlisted'
}

const STATUS_BADGE: Record<ConfirmationRegistration['confirmationStatus'], { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  confirmed: { label: 'Terkonfirmasi', variant: 'default' },
  pending: { label: 'Menunggu', variant: 'secondary' },
  waitlisted: { label: 'Waitlist', variant: 'outline' },
}

interface ConfirmationTableProps {
  registrations: ConfirmationRegistration[]
  onResend: (id: string) => void
  onPromote: (id: string) => void
  isPending: boolean
}

export function ConfirmationTable({ registrations, onResend, onPromote, isPending }: ConfirmationTableProps) {
  const [page, setPage] = useState(0)

  if (registrations.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        Belum ada data konfirmasi.
      </div>
    )
  }

  const pagedRegs = registrations.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  return (
    <>
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Peserta</TableHead>
          <TableHead>Saluran</TableHead>
          <TableHead>Tiket Dikirim</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Aksi</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {pagedRegs.map((reg) => (
          <TableRow
            key={reg.id}
            className={cn(reg.confirmationStatus === 'pending' && 'bg-amber-50')}
          >
            <TableCell>
              <div>
                <p className="text-sm font-medium">{reg.contact.name}</p>
                <p className="text-xs text-muted-foreground">{reg.contact.company}</p>
              </div>
            </TableCell>
            <TableCell>
              {reg.channel === 'whatsapp' ? (
                <MessageCircle className="h-4 w-4 text-green-600" aria-label="WhatsApp" />
              ) : (
                <Mail className="h-4 w-4 text-blue-600" aria-label="Email" />
              )}
            </TableCell>
            <TableCell className="text-xs text-muted-foreground">
              {reg.ticketSentAt
                ? new Date(reg.ticketSentAt).toLocaleDateString('id-ID', {
                    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                  })
                : '—'}
            </TableCell>
            <TableCell>
              <Badge variant={STATUS_BADGE[reg.confirmationStatus].variant}>
                {STATUS_BADGE[reg.confirmationStatus].label}
              </Badge>
            </TableCell>
            <TableCell>
              <div className="flex gap-1">
                {reg.confirmationStatus !== 'waitlisted' && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => onResend(reg.id)}
                    disabled={isPending}
                  >
                    Kirim Ulang Tiket
                  </Button>
                )}
                {reg.confirmationStatus === 'waitlisted' && (
                  <Button
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => onPromote(reg.id)}
                    disabled={isPending}
                  >
                    Promosi ke Approved
                  </Button>
                )}
              </div>
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
    />
    </>
  )
}
