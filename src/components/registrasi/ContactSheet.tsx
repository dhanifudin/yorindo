'use client'

import { useEffect, useCallback } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AiScoreBadge } from './AiScoreBadge'
import { ChevronLeft, ChevronRight, Flag } from 'lucide-react'
import type { FlagCategory, Registration } from '@/types/api'

interface ContactSheetRegistration {
  id: string
  contactName: string
  contactEmail: string
  contactPhone: string
  contactFlagCategory: FlagCategory
  aiScore: number
  flagOverride: boolean
  status: Registration['status']
  createdAt: string
}

interface ContactSheetProps {
  registration: ContactSheetRegistration | null
  currentIndex: number
  total: number
  onClose: () => void
  onNext: () => void
  onPrev: () => void
  onApprove: (id: string) => void
  onReject: (id: string) => void
  isPending: boolean
}

const STATUS_LABEL: Record<Registration['status'], string> = {
  pending: 'Pending',
  confirmed: 'Terkonfirmasi',
  approved: 'Disetujui',
  rejected: 'Ditolak',
  waitlisted: 'Waitlist',
  attended: 'Hadir',
  cancelled: 'Dibatalkan',
}

export function ContactSheet({
  registration,
  currentIndex,
  total,
  onClose,
  onNext,
  onPrev,
  onApprove,
  onReject,
  isPending,
}: ContactSheetProps) {
  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!registration) return
      if (e.key === 'ArrowRight') onNext()
      if (e.key === 'ArrowLeft') onPrev()
    },
    [registration, onNext, onPrev]
  )

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const showFlag =
    registration &&
    !registration.flagOverride &&
    (registration.contactFlagCategory === 'invalid-data' || registration.contactFlagCategory === 'duplicate')

  return (
    <Sheet open={!!registration} onOpenChange={(v) => !v && onClose()}>
      <SheetContent>
        <SheetHeader>
          <div className="flex items-center justify-between pr-8">
            <SheetTitle>{registration?.contactName ?? '—'}</SheetTitle>
            <span className="text-xs text-muted-foreground">
              {currentIndex + 1} / {total}
            </span>
          </div>
          <SheetDescription>{registration?.contactEmail}</SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-4 px-4 flex-1 overflow-y-auto">
          {/* Navigation arrows */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon-sm"
              onClick={onPrev}
              disabled={currentIndex === 0}
              aria-label="Peserta sebelumnya"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={onNext}
              disabled={currentIndex >= total - 1}
              aria-label="Peserta berikutnya"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <span className="text-xs text-muted-foreground ml-1">
              Gunakan ← → untuk navigasi
            </span>
          </div>

          {registration && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-medium">Telepon</p>
                  <p className="font-medium">{registration.contactPhone}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-medium">Skor AI</p>
                  <AiScoreBadge score={registration.aiScore} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-medium">Status</p>
                  <Badge variant="outline">{STATUS_LABEL[registration.status]}</Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-medium">Terdaftar</p>
                  <p className="text-xs">{new Date(registration.createdAt).toLocaleDateString('id-ID')}</p>
                </div>
              </div>

              {showFlag && (
                <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2">
                  <div className="flex items-center gap-1.5">
                    <Flag className="h-3.5 w-3.5 text-red-600" />
                    <span className="text-xs font-medium text-red-700">
                      Kontak ditandai: {registration.contactFlagCategory}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {registration?.status === 'pending' && (
          <SheetFooter>
            <Button
              variant="outline"
              className="text-destructive border-destructive/30"
              onClick={() => onReject(registration.id)}
              disabled={isPending}
            >
              Tolak
            </Button>
            <Button
              onClick={() => onApprove(registration.id)}
              disabled={isPending}
            >
              Setujui
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  )
}
