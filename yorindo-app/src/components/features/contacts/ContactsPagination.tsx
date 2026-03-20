'use client'

import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { useContacts } from '@/hooks/useContacts'
import { Button } from '@/components/ui/button'

export function ContactsPagination() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const { data } = useContacts()

  const page = parseInt(searchParams.get('page') ?? '1', 10)
  const totalPages = data?.pagination.totalPages ?? 1
  const total = data?.pagination.total ?? 0

  const setPage = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', String(newPage))
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex items-center justify-between mt-4">
      <p className="text-sm text-muted-foreground">
        Total <span className="font-medium text-foreground">{total}</span> kontak
      </p>
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage(page - 1)}
          disabled={page <= 1}
        >
          Sebelumnya
        </Button>
        <span className="text-sm text-muted-foreground">
          Halaman {page} dari {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage(page + 1)}
          disabled={page >= totalPages}
        >
          Berikutnya
        </Button>
      </div>
    </div>
  )
}
