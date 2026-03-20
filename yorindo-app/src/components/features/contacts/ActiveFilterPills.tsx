'use client'

import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'

const FILTER_LABELS: Record<string, string> = {
  industry: 'Industri',
  city: 'Kota',
  companySize: 'Ukuran',
  q: 'Pencarian',
}

const FILTER_KEYS = ['industry', 'city', 'companySize', 'q']

interface ActiveFilterPillsProps {
  total?: number
}

export function ActiveFilterPills({ total }: ActiveFilterPillsProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const activeFilters = FILTER_KEYS
    .map((key) => ({ key, value: searchParams.get(key) ?? '' }))
    .filter(({ value }) => !!value)

  if (activeFilters.length === 0) return null

  const removeFilter = (key: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete(key)
    params.delete('page')
    router.push(`${pathname}?${params.toString()}`)
  }

  const clearAll = () => {
    const params = new URLSearchParams(searchParams.toString())
    FILTER_KEYS.forEach((k) => params.delete(k))
    params.delete('page')
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="mb-3">
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex items-center gap-2 pb-2">
          {activeFilters.map(({ key, value }) => (
            <Badge
              key={key}
              variant="secondary"
              className="flex items-center gap-1 pr-1"
            >
              <span>{FILTER_LABELS[key] ?? key}: {value}</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 ml-1 hover:bg-transparent"
                onClick={() => removeFilter(key)}
                aria-label={`Hapus filter ${FILTER_LABELS[key] ?? key}`}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
          {activeFilters.length >= 2 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-auto py-0.5 px-2 text-muted-foreground"
              onClick={clearAll}
            >
              Hapus semua
            </Button>
          )}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
      {total !== undefined && (
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{total}</span> kontak ditemukan
        </p>
      )}
    </div>
  )
}
