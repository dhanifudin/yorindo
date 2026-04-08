'use client'

import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useContacts } from '@/hooks/useContacts'
import { Button } from '@/components/ui/button'
import { useFilterStore } from '@/store/filterStore'

function getPageNumbers(page: number, pageCount: number): (number | '...')[] {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1)

  const window = new Set(
    [1, pageCount, page - 1, page, page + 1].filter((p) => p >= 1 && p <= pageCount),
  )
  const sorted = [...window].sort((a, b) => a - b)

  const result: (number | '...')[] = []
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1]! > 1) result.push('...')
    result.push(p)
  })
  return result
}

export function ContactsPagination() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const { data } = useContacts()
  const setFilter = useFilterStore((s) => s.setFilter)

  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1)
  const totalPages = data?.pagination.totalPages ?? 1
  const total = data?.pagination.total ?? 0

  const setPage = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', String(newPage))
    setFilter({ page: newPage })
    router.push(`${pathname}?${params.toString()}`)
  }

  if (totalPages <= 1) return null

  const pages = getPageNumbers(page, totalPages)

  return (
    <div className="flex items-center justify-between mt-4">
      <p className="text-sm text-muted-foreground">
        Total <span className="font-medium text-foreground">{total}</span> kontak
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => setPage(page - 1)}
          disabled={page <= 1}
          aria-label="Halaman sebelumnya"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`ellipsis-${i}`} className="text-xs text-muted-foreground px-1">
              …
            </span>
          ) : (
            <Button
              key={p}
              variant={p === page ? 'default' : 'outline'}
              size="sm"
              className="h-8 w-8 p-0 text-xs"
              onClick={() => setPage(p as number)}
              aria-label={`Halaman ${p}`}
              aria-current={p === page ? 'page' : undefined}
            >
              {p}
            </Button>
          ),
        )}

        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => setPage(page + 1)}
          disabled={page >= totalPages}
          aria-label="Halaman berikutnya"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
