'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

interface BulkApproveBarProps {
  aiRecommendedCount: number
  aiScoringStatus: 'complete' | 'in-progress' | 'failed'
  aiScoringProgress?: { done: number; total: number }
  selectedCount: number
  onBulkApprove: (ids: string[]) => void
  aiRecommendedIds: string[]
  selectedIds: string[]
  className?: string
}

export function BulkApproveBar({
  aiRecommendedCount,
  aiScoringStatus,
  aiScoringProgress,
  selectedCount,
  onBulkApprove,
  aiRecommendedIds,
  selectedIds,
  className,
}: BulkApproveBarProps) {
  const [confirmState, setConfirmState] = useState<'idle' | 'confirming'>('idle')
  const [countdown, setCountdown] = useState(3)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const countdownRef = useRef<ReturnType<typeof setInterval>>(undefined)

  useEffect(() => {
    return () => {
      clearTimeout(timerRef.current)
      clearInterval(countdownRef.current)
    }
  }, [])

  function handleFirstClick() {
    if (confirmState === 'idle') {
      setConfirmState('confirming')
      setCountdown(3)
      countdownRef.current = setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) {
            clearInterval(countdownRef.current)
            return 3
          }
          return c - 1
        })
      }, 1000)
      timerRef.current = setTimeout(() => {
        setConfirmState('idle')
        setCountdown(3)
        clearInterval(countdownRef.current)
      }, 3000)
    } else {
      // Second click — commit
      clearTimeout(timerRef.current)
      clearInterval(countdownRef.current)
      setConfirmState('idle')
      setCountdown(3)
      const ids = selectedCount > 0 ? selectedIds : aiRecommendedIds
      onBulkApprove(ids)
    }
  }

  const isManualMode = selectedCount > 0
  const approveCount = isManualMode ? selectedCount : aiRecommendedCount
  const isDisabled = aiScoringStatus === 'in-progress' || approveCount === 0

  if (aiScoringStatus === 'in-progress' && aiScoringProgress) {
    const pct = aiScoringProgress.total > 0
      ? Math.round((aiScoringProgress.done / aiScoringProgress.total) * 100)
      : 0
    return (
      <div className={cn('rounded-lg border bg-muted/40 px-4 py-3 space-y-2', className)}>
        <p className="text-sm text-muted-foreground">
          Penilaian AI sedang berjalan… ({aiScoringProgress.done}/{aiScoringProgress.total} selesai)
        </p>
        <Progress value={pct} />
      </div>
    )
  }

  return (
    <div className={cn('flex items-center gap-3 rounded-lg border px-4 py-2', className)}>
      <div className="flex-1 text-sm">
        {isManualMode ? (
          <span><strong>{selectedCount}</strong> baris dipilih</span>
        ) : (
          <span>
            <strong>{aiRecommendedCount}</strong> rekomendasi AI siap disetujui
          </span>
        )}
      </div>
      <Button
        size="sm"
        disabled={isDisabled}
        onClick={handleFirstClick}
        variant={confirmState === 'confirming' ? 'outline' : 'default'}
        className={cn(
          confirmState === 'confirming' && 'border-amber-500 text-amber-700 hover:bg-amber-50'
        )}
        aria-label={confirmState === 'confirming' ? `Konfirmasi persetujuan dalam ${countdown} detik` : 'Terima semua rekomendasi AI'}
      >
        {confirmState === 'confirming'
          ? `Konfirmasi? (${countdown}…)`
          : isManualMode
          ? `Setujui ${selectedCount} terpilih`
          : 'Terima Semua Rekomendasi AI'}
      </Button>
    </div>
  )
}
