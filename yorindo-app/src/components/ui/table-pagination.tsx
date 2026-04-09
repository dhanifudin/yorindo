'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface TablePaginationProps {
  page: number          // 0-indexed current page
  pageSize: number
  total: number         // total rows (before pagination)
  onPrev: () => void
  onNext: () => void
  onPageChange?: (page: number) => void
}

function getPageNumbers(page: number, pageCount: number): (number | '...')[] {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i)

  const window = new Set(
    [0, pageCount - 1, page - 1, page, page + 1].filter((p) => p >= 0 && p < pageCount),
  )
  const sorted = [...window].sort((a, b) => a - b)

  const result: (number | '...')[] = []
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1]! > 1) result.push('...')
    result.push(p)
  })
  return result
}

/** Renders prev/next + page number pagination controls. Returns null when total ≤ 20. */
export function TablePagination({
  page,
  pageSize,
  total,
  onPrev,
  onNext,
  onPageChange,
}: TablePaginationProps) {
  if (total <= 20) return null

  const pageCount = Math.ceil(total / pageSize)
  const canPrev = page > 0
  const canNext = page < pageCount - 1
  const from = page * pageSize + 1
  const to = Math.min((page + 1) * pageSize, total)
  const pages = getPageNumbers(page, pageCount)

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

        {onPageChange &&
          pages.map((p, i) =>
            p === '...' ? (
              <span key={`ellipsis-${i}`} className="text-xs text-muted-foreground px-1">
                …
              </span>
            ) : (
              <Button
                key={p}
                variant={p === page ? 'default' : 'outline'}
                size="sm"
                className="h-7 w-7 p-0 text-xs"
                onClick={() => onPageChange(p)}
                aria-label={`Halaman ${p + 1}`}
                aria-current={p === page ? 'page' : undefined}
              >
                {p + 1}
              </Button>
            ),
          )}

        {!onPageChange && (
          <span className="text-xs text-muted-foreground px-1">
            {page + 1}/{pageCount}
          </span>
        )}

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
