'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { ColumnFiltersState } from '@tanstack/react-table'

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected'

interface RegistrationFiltersProps {
  columnFilters: ColumnFiltersState
  onColumnFiltersChange: (filters: ColumnFiltersState) => void
}

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Semua' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Disetujui' },
  { value: 'rejected', label: 'Ditolak' },
]

export function RegistrationFilters({ columnFilters, onColumnFiltersChange }: RegistrationFiltersProps) {
  const statusFilter = (columnFilters.find((f) => f.id === 'status')?.value as StatusFilter) ?? 'all'

  const activeCount = columnFilters.filter((f) => {
    if (f.id === 'status' && f.value === 'all') return false
    return true
  }).length

  function setStatus(value: StatusFilter) {
    const without = columnFilters.filter((f) => f.id !== 'status')
    if (value === 'all') {
      onColumnFiltersChange(without)
    } else {
      onColumnFiltersChange([...without, { id: 'status', value }])
    }
  }

  function resetFilters() {
    onColumnFiltersChange([])
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Status filters */}
      {STATUS_OPTIONS.map((opt) => (
        <Button
          key={opt.value}
          variant={statusFilter === opt.value || (opt.value === 'all' && statusFilter === 'all') ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setStatus(opt.value)}
          className="h-7 text-xs"
        >
          {opt.label}
        </Button>
      ))}

      {/* Reset */}
      {activeCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs text-muted-foreground"
          onClick={resetFilters}
        >
          Reset filter
          <Badge variant="secondary" className="ml-1 h-4 w-4 flex items-center justify-center p-0 text-xs">
            {activeCount}
          </Badge>
        </Button>
      )}
    </div>
  )
}
