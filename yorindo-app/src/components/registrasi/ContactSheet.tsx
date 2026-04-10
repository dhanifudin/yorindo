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
import { ChevronLeft, ChevronRight, UserCheck } from 'lucide-react'
import type { Registration } from '@/types/api'

interface SurveyResponse {
  question: string
  answer: string | number | boolean | string[]
}

interface ContactSheetRegistration {
  id: string
  contactName: string
  contactEmail: string
  contactPhone: string
  status: Registration['status']
  createdAt: string
  // Survey answers from the form the user filled; can be Record<string, unknown> or SurveyResponse[]
  surveyAnswers?: Record<string, unknown>
  surveyResponses?: SurveyResponse[]
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

  // Convert surveyAnswers (Record<string, unknown>) to SurveyResponse[] format
  const answersFromApi = registration?.surveyAnswers
  const responsesFromApi: SurveyResponse[] | null = answersFromApi && Object.keys(answersFromApi).length > 0
    ? Object.entries(answersFromApi)
        .filter(([, value]) => value !== null && value !== undefined && value !== '')
        .map(([key, value]) => ({
          question: key
            .replace(/([A-Z])/g, ' $1')
            .replace(/_/g, ' ')
            .replace(/^./, (s) => s.toUpperCase()),
          answer: Array.isArray(value) ? value : String(value),
        }))
    : null

  const displayResponses = responsesFromApi || (registration?.surveyResponses ?? [])

  return (
    <Sheet open={!!registration} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center justify-between pr-8">
            <SheetTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              {registration?.contactName ?? '—'}
            </SheetTitle>
            <span className="text-xs text-muted-foreground">
              {currentIndex + 1} / {total}
            </span>
          </div>
          <SheetDescription className="text-base">
            {registration?.contactEmail}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-6 py-6 px-1">
          {/* Navigation */}
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon-sm"
              onClick={onPrev}
              disabled={currentIndex === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={onNext}
              disabled={currentIndex >= total - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <span className="text-xs text-muted-foreground">
              Gunakan ← → atau tombol di atas untuk navigasi
            </span>
          </div>

          {registration && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-medium">Telepon</p>
                  <p className="font-medium">{registration.contactPhone}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-medium">Status</p>
                  <Badge variant="outline">{STATUS_LABEL[registration.status]}</Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-medium">Terdaftar</p>
                  <p className="text-xs">
                    {new Date(registration.createdAt).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </div>

              {/* Survey Responses - Main Section */}
              {displayResponses.length > 0 ? (
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    📋 Jawaban Formulir Pendaftaran
                  </h3>
                  <div className="space-y-4">
                    {displayResponses.map((item, index) => (
                      <div
                        key={index}
                        className="bg-muted/50 rounded-lg p-4 border"
                      >
                        <p className="text-xs text-muted-foreground mb-1 font-medium">
                          {item.question}
                        </p>
                        <p className="text-sm leading-relaxed">
                          {Array.isArray(item.answer)
                            ? item.answer.join(', ')
                            : item.answer?.toString() || '—'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Tidak ada jawaban formulir untuk pendaftaran ini.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons - Only show for pending registrations */}
        {registration?.status === 'pending' && (
          <SheetFooter className="border-t pt-4">
            <Button
              variant="outline"
              className="text-destructive border-destructive/30 hover:bg-destructive/10"
              onClick={() => onReject(registration.id)}
              disabled={isPending}
            >
              ❌ Tolak
            </Button>
            <Button
              onClick={() => onApprove(registration.id)}
              disabled={isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              ✅ Setujui Peserta
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  )
}