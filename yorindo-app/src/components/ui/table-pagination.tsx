'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface TablePaginationProps {
  page: number          // 0-indexed current page
  pageSize: number
  total: number         // total rows (before pagination)
  onPrev: () => void
  onNext: () => void
}

/** Renders prev/next pagination controls. Returns null when total ≤ 20. */
export function TablePagination({ page, pageSize, total, onPrev, onNext }: TablePaginationProps) {
  if (total <= 20) return null

  const pageCount = Math.ceil(total / pageSize)
  const canPrev = page > 0
  const canNext = page < pageCount - 1
  const from = page * pageSize + 1
  const to = Math.min((page + 1) * pageSize, total)

  return (
    <div className="flex items-center justify-between pt-2">
      <p className="text-xs text-muted-foreground">
        {from}–{to} dari {total}
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={onPrev}
          disabled={!canPrev}
          aria-label="Halaman sebelumnya"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-xs text-muted-foreground px-1">
          {page + 1}/{pageCount}
        </span>
        <Button
          variant="outline"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={onNext}
          disabled={!canNext}
          aria-label="Halaman berikutnya"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
