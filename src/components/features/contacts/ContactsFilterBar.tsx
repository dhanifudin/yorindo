'use client'

import { useCallback, useRef, useState } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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

const COMPANY_SIZES = [
  { value: '', label: 'Semua Ukuran' },
  { value: 'micro', label: 'Micro' },
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
  { value: 'enterprise', label: 'Enterprise' },
]

const INDUSTRIES = [
  { value: '', label: 'Semua Industri' },
  { value: 'teknologi', label: 'Teknologi' },
  { value: 'kesehatan', label: 'Kesehatan' },
  { value: 'manufaktur', label: 'Manufaktur' },
  { value: 'keuangan', label: 'Keuangan' },
  { value: 'pendidikan', label: 'Pendidikan' },
  { value: 'retail', label: 'Retail' },
  { value: 'properti', label: 'Properti' },
  { value: 'otomotif', label: 'Otomotif' },
  { value: 'energi', label: 'Energi' },
  { value: 'telekomunikasi', label: 'Telekomunikasi' },
]

interface IndustrySuggestion {
  slug: string
  label: string
  confidence: number
}

interface SuggestionResponse {
  suggestions: IndustrySuggestion[]
  matchedSlug: string | null
  fallback: boolean
}

export function ContactsFilterBar() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const industry = searchParams.get('industry') ?? ''
  const city = searchParams.get('city') ?? ''
  const companySize = searchParams.get('companySize') ?? ''
  const q = searchParams.get('q') ?? ''

  const hasActiveFilters = !!(industry || city || companySize || q)

  // Facets query
  const { data: facets } = useQuery<ContactsFacets>({
    queryKey: ['contacts-facets'],
    queryFn: () => fetch('/api/contacts/facets').then((r) => r.json()),
    staleTime: 5 * 60 * 1000,
  })

  // Smart filter state
  const [smartQuery, setSmartQuery] = useState(q)
  const [aiStatus, setAiStatus] = useState<'idle' | 'loading' | 'matched' | 'fallback'>('idle')
  const [matchedSlug, setMatchedSlug] = useState<string | null>(null)
  const [useSmartMode, setUseSmartMode] = useState(false)
  const [segmentName, setSegmentName] = useState('')
  const smartDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const updateParam = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    params.delete('page') // reset to page 1 on filter change
    router.push(`${pathname}?${params.toString()}`)
  }, [searchParams, router, pathname])

  const debounce = useCallback((fn: () => void) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(fn, 300)
  }, [])

  const fetchIndustrySuggestions = async (qval: string) => {
    if (!qval || qval.length < 2) {
      setAiStatus('idle')
      setMatchedSlug(null)
      return
    }
    setAiStatus('loading')
    try {
      const res = await fetch(`/api/contacts/industry-suggestions?q=${encodeURIComponent(qval)}`)
      const data: SuggestionResponse = await res.json()
      if (data.fallback || !data.matchedSlug) {
        setAiStatus('fallback')
        setMatchedSlug(null)
      } else {
        setAiStatus('matched')
        setMatchedSlug(data.matchedSlug)
        updateParam('industry', data.matchedSlug)
      }
    } catch {
      setAiStatus('fallback')
      setMatchedSlug(null)
    }
  }

  const handleSmartQueryChange = (val: string) => {
    setSmartQuery(val)
    if (smartDebounceRef.current) clearTimeout(smartDebounceRef.current)
    smartDebounceRef.current = setTimeout(() => fetchIndustrySuggestions(val), 500)
  }

  const clearSmartFilter = () => {
    setSmartQuery('')
    setAiStatus('idle')
    setMatchedSlug(null)
    setUseSmartMode(false)
    updateParam('industry', '')
  }

  const handleReset = () => {
    const params = new URLSearchParams()
    router.push(pathname)
    setSmartQuery('')
    setAiStatus('idle')
    setMatchedSlug(null)
    setUseSmartMode(false)
  }

  const handleSaveSegment = () => {
    if (!segmentName.trim()) return
    const segments = JSON.parse(localStorage.getItem('yorindo:segments') ?? '[]') as Array<{ name: string; params: Record<string, string> }>
    segments.push({ name: segmentName.trim(), params: Object.fromEntries(searchParams) })
    localStorage.setItem('yorindo:segments', JSON.stringify(segments))
    toast.success(`Segmen '${segmentName.trim()}' disimpan`)
    setSegmentName('')
  }

  // Get facet count for industry
  const getIndustryCount = (slug: string) => {
    if (!facets) return null
    const f = facets.industry.find((i) => i.slug === slug)
    return f?.count ?? null
  }

  // Get facet count for company size
  const getCompanySizeCount = (slug: string) => {
    if (!facets) return null
    const f = facets.companySize.find((s) => s.slug === slug)
    return f?.count ?? null
  }

  const isSearching = aiStatus === 'loading'

  return (
    <div className="flex flex-wrap gap-3 mb-4 items-end">
      {/* Industry filter */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <label className="block text-xs text-muted-foreground">Industri</label>
          <button
            type="button"
            onClick={() => {
              if (useSmartMode) clearSmartFilter()
              else setUseSmartMode(true)
            }}
            className="text-xs text-primary underline"
          >
            {useSmartMode ? 'Ganti ke dropdown' : '✨ AI Smart Search'}
          </button>
        </div>
        {useSmartMode ? (
          <div className="relative w-48">
            <div className="relative">
              <Input
                type="text"
                placeholder="Ketik industri bebas..."
                value={smartQuery}
                onChange={(e) => handleSmartQueryChange(e.target.value)}
                className="h-9 pr-16"
                aria-busy={isSearching}
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {isSearching && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                <Badge className="bg-violet-100 text-violet-700 text-[10px] px-1 py-0">AI ✦</Badge>
              </div>
            </div>
            {aiStatus === 'matched' && matchedSlug && (
              <div className="mt-1">
                <Badge className="bg-green-100 text-green-700 text-xs">
                  AI: {INDUSTRIES.find((i) => i.value === matchedSlug)?.label ?? matchedSlug}
                </Badge>
              </div>
            )}
            {aiStatus === 'fallback' && (
              <div className="mt-1">
                <p className="text-xs text-muted-foreground">Tidak cocok — gunakan dropdown:</p>
                <Select
                  value={industry || 'all'}
                  onValueChange={(val) => updateParam('industry', val === 'all' ? '' : val)}
                >
                  <SelectTrigger className="w-48 mt-1 h-9">
                    <SelectValue placeholder="Semua Industri" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Industri</SelectItem>
                    {INDUSTRIES.slice(1).map((i) => {
                      const count = getIndustryCount(i.value)
                      return (
                        <SelectItem key={i.value} value={i.value}>
                          {i.label}{count !== null ? ` (${count})` : ''}
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        ) : (
          <Select
            value={industry || 'all'}
            onValueChange={(val) => updateParam('industry', val === 'all' ? '' : val)}
          >
            <SelectTrigger className="w-48 h-9">
              <SelectValue placeholder="Semua Industri" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Industri</SelectItem>
              {INDUSTRIES.slice(1).map((i) => {
                const count = getIndustryCount(i.value)
                return (
                  <SelectItem key={i.value} value={i.value}>
                    {i.label}{count !== null ? ` (${count})` : ''}
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* City filter */}
      <div>
        <label className="block text-xs text-muted-foreground mb-1">Kota</label>
        <Input
          type="text"
          placeholder="Cari kota..."
          defaultValue={city}
          onChange={(e) => debounce(() => updateParam('city', e.target.value))}
          className="w-40"
        />
      </div>

      {/* Company size filter */}
      <div>
        <label className="block text-xs text-muted-foreground mb-1">Ukuran Perusahaan</label>
        <Select
          value={companySize || 'all'}
          onValueChange={(val) => updateParam('companySize', val === 'all' ? '' : val)}
        >
          <SelectTrigger className="w-40 h-9">
            <SelectValue placeholder="Semua Ukuran" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Ukuran</SelectItem>
            {COMPANY_SIZES.slice(1).map((s) => {
              const count = getCompanySizeCount(s.value)
              return (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}{count !== null ? ` (${count})` : ''}
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
      </div>

      {/* Action buttons */}
      <Button variant="outline" onClick={handleReset}>
        Reset Filter
      </Button>

      {/* Save Segment popover — only when filters active */}
      {hasActiveFilters && (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">Simpan Segmen</Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 space-y-2 p-3">
            <Input
              placeholder="Nama segmen..."
              autoFocus
              className="h-8"
              value={segmentName}
              onChange={(e) => setSegmentName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveSegment()}
            />
            <Button size="sm" className="w-full" onClick={handleSaveSegment}>Simpan</Button>
          </PopoverContent>
        </Popover>
      )}
    </div>
  )
}
