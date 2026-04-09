'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'

interface BulkApproveBarProps {
  selectedCount: number
  onBulkApprove: (ids: string[]) => void
  onBulkReject: (ids: string[]) => void
  selectedIds: string[]
  className?: string
}

export function BulkApproveBar({
  selectedCount,
  onBulkApprove,
  onBulkReject,
  selectedIds,
  className,
}: BulkApproveBarProps) {
  const [approveConfirmOpen, setApproveConfirmOpen] = useState(false)
  const [rejectConfirmOpen, setRejectConfirmOpen] = useState(false)

  const isDisabled = selectedCount === 0

  function handleBulkApprove() {
    onBulkApprove(selectedIds)
    setApproveConfirmOpen(false)
  }

  function handleBulkReject() {
    onBulkReject(selectedIds)
    setRejectConfirmOpen(false)
  }

  return (
    <>
      <div className={cn('flex items-center gap-3 rounded-lg border px-4 py-2', className)}>
        <div className="flex-1 text-sm">
          <span><strong>{selectedCount}</strong> baris dipilih</span>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            disabled={isDisabled}
            onClick={() => setApproveConfirmOpen(true)}
            aria-label={`Setujui ${selectedCount} pendaftar terpilih`}
          >
            {`Setujui ${selectedCount} terpilih`}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={isDisabled}
            onClick={() => setRejectConfirmOpen(true)}
            className="text-destructive"
            aria-label={`Tolak ${selectedCount} pendaftar terpilih`}
          >
            {`Tolak ${selectedCount} terpilih`}
          </Button>
        </div>
      </div>

      {/* Approve confirmation dialog */}
      <AlertDialog open={approveConfirmOpen} onOpenChange={setApproveConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Setujui Pendaftaran?</AlertDialogTitle>
            <AlertDialogDescription>
              Anda akan menyetujui <strong>{selectedCount}</strong> pendaftar sekaligus. Tiket akan dikirim ke email masing-masing peserta.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkApprove}>
              Ya, Setujui Semua
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject confirmation dialog */}
      <AlertDialog open={rejectConfirmOpen} onOpenChange={setRejectConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tolak Pendaftaran?</AlertDialogTitle>
            <AlertDialogDescription>
              Anda akan menolak <strong>{selectedCount}</strong> pendaftar sekaligus. Email penolakan akan dikirim ke masing-masing peserta.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleBulkReject}
            >
              Ya, Tolak Semua
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

