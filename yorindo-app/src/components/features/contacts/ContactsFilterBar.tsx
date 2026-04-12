'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Combobox } from '@/components/ui/combobox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { toast } from 'sonner'
import type { ContactsFacets } from '@/types/api'
import { useIndustries, useJobTitles } from '@/hooks/useStandardValues'

export function ContactsFilterBar() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const serviceType = searchParams.get('serviceType') ?? ''
  const city = searchParams.get('city') ?? ''
  const jobTitle = searchParams.get('jobTitle') ?? ''
  const q = searchParams.get('q') ?? ''

  const hasActiveFilters = !!(serviceType || city || jobTitle || q)

  // ── State lokal untuk input nama (debounced ke URL param q) ──
  const [nameQuery, setNameQuery] = useState(q)

  // Facets query
  const { data: facets } = useQuery<ContactsFacets>({
    queryKey: ['contacts-facets'],
    queryFn: () => fetch('/api/contacts/facets').then((r) => r.json()),
    staleTime: 5 * 60 * 1000,
  })

  // Cities for dropdown
  const { data: citiesData } = useQuery<Array<{ city_code: string; city_name: string }>>({
    queryKey: ['cities'],
    queryFn: () => fetch('/api/cities').then((r) => r.json()).then((d) => d.data),
    staleTime: 5 * 60 * 1000,
  })

  const cityOptions = useMemo(() => {
    if (!citiesData) return []
    return citiesData.map((c: { city_name: string }) => ({ value: c.city_name, label: c.city_name }))
  }, [citiesData])

  // Industries from API
  const { data: industriesData } = useIndustries()
  const industryOptions = useMemo(() => {
    if (!industriesData) return []
    return industriesData.map((ind) => ({ value: ind.slug, label: ind.name }))
  }, [industriesData])

  // Job titles from API
  const { data: jobTitlesData } = useJobTitles()
  const jobTitleOptions = useMemo(() => {
    if (!jobTitlesData) return []
    return jobTitlesData.map((jt) => ({ value: jt.name, label: jt.name }))
  }, [jobTitlesData])

  const updateParam = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    params.delete('page')
    router.push(`${pathname}?${params.toString()}`)
  }, [searchParams, router, pathname])

  // ── Handler search nama (debounce 350ms ke URL param q) ──────────────────
  const handleNameChange = (val: string) => {
    setNameQuery(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      updateParam('q', val)
    }, 350)
  }

  const clearNameSearch = () => {
    setNameQuery('')
    updateParam('q', '')
  }

  const handleReset = () => {
    router.push(pathname)
    setNameQuery('')
  }

  const handleSaveSegment = () => {
    if (!segmentName.trim()) return
    const segments = JSON.parse(localStorage.getItem('yorindo:segments') ?? '[]') as Array<{ name: string; params: Record<string, string> }>
    segments.push({ name: segmentName.trim(), params: Object.fromEntries(searchParams) })
    localStorage.setItem('yorindo:segments', JSON.stringify(segments))
    toast.success(`Segmen '${segmentName.trim()}' disimpan`)
    setSegmentName('')
  }

  const getServiceTypeCount = (slug: string) => {
    if (!facets || !facets.serviceType) return null
    const f = facets.serviceType.find((i) => i.slug === slug)
    return f?.count ?? null
  }

  const [segmentName, setSegmentName] = useState('')

  return (
    <div className="flex flex-wrap gap-3 mb-4 items-end">

      {/* ── SEARCH NAMA ──────────────────────────────────────────────────── */}
      <div>
        <label className="block text-xs text-muted-foreground mb-1">Cari Nama</label>
        <div className="relative w-48">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <Input
            type="text"
            placeholder="Cari nama kontak..."
            value={nameQuery}
            onChange={(e) => handleNameChange(e.target.value)}
            className="h-9 pl-8 pr-7"
          />
          {nameQuery && (
            <button
              type="button"
              onClick={clearNameSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ── INDUSTRI filter ───────────────────────────────────────────────── */}
      <div>
        <label className="block text-xs text-muted-foreground mb-1">Industri</label>
        <Select
          value={serviceType || 'all'}
          onValueChange={(val) => updateParam('serviceType', val === 'all' ? '' : val)}
        >
          <SelectTrigger className="w-48 h-9">
            <SelectValue placeholder="Semua Industri" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Industri</SelectItem>
            {industryOptions.map((i) => {
              const count = getServiceTypeCount(i.value)
              return (
                <SelectItem key={i.value} value={i.value}>
                  {i.label}{count !== null ? ` (${count})` : ''}
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
      </div>

      {/* ── KOTA filter ───────────────────────────────────────────────────── */}
      <div>
        <label className="block text-xs text-muted-foreground mb-1">Kota</label>
        <Combobox
          options={cityOptions}
          value={city}
          onValueChange={(v) => updateParam('city', v)}
          placeholder="Pilih kota..."
          searchPlaceholder="Cari kota..."
          emptyText="Kota tidak ditemukan."
        />
      </div>

      {/* ── JABATAN filter ────────────────────────────────────────────────── */}
      <div>
        <label className="block text-xs text-muted-foreground mb-1">Jabatan</label>
        <Combobox
          options={jobTitleOptions}
          value={jobTitle}
          onValueChange={(v) => updateParam('jobTitle', v)}
          placeholder="Pilih jabatan..."
          searchPlaceholder="Cari jabatan..."
          emptyText="Jabatan tidak ditemukan."
        />
      </div>

      {/* Action buttons */}
      <Button variant="outline" onClick={handleReset}>
        Reset Filter
      </Button>

      {/* Save Segment popover */}
      {hasActiveFilters && (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">Simpan Segmen</Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 space-y-2 p-3">
            <p className="text-sm font-medium">Simpan Filter Saat Ini</p>
            <Input
              placeholder="Nama segmen..."
              value={segmentName}
              onChange={(e) => setSegmentName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveSegment()}
              className="h-9"
            />
            <Button
              size="sm"
              className="w-full"
              onClick={handleSaveSegment}
              disabled={!segmentName.trim()}
            >
              Simpan
            </Button>
          </PopoverContent>
        </Popover>
      )}
    </div>
  )
}
