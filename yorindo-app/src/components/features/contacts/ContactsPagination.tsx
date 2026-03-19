'use client'

import { useFilterStore } from '@/store/filterStore'
import { useContacts } from '@/hooks/useContacts'
import { Button } from '@/components/ui/button'

export function ContactsPagination() {
  const { page, setFilter } = useFilterStore()
  const { data } = useContacts()

  const totalPages = data?.pagination.totalPages ?? 1
  const total = data?.pagination.total ?? 0

  return (
    <div className="flex items-center justify-between mt-4">
      <p className="text-sm text-muted-foreground">
        Total <span className="font-medium text-foreground">{total}</span> kontak
      </p>
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setFilter({ page: page - 1 })}
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
          onClick={() => setFilter({ page: page + 1 })}
          disabled={page >= totalPages}
        >
          Berikutnya
        </Button>
      </div>
    </div>
  )
}
