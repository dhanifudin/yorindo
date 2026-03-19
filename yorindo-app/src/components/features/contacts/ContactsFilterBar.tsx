'use client'

import { useCallback, useRef, useState } from 'react'
import { useFilterStore } from '@/store/filterStore'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

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

// Native select styled to match shadcn Input visually
const nativeSelectClass =
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50'

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
  const { industry, city, companySize, setFilter, resetFilter } = useFilterStore()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Smart filter state
  const [smartQuery, setSmartQuery] = useState('')
  const [aiStatus, setAiStatus] = useState<'idle' | 'loading' | 'matched' | 'fallback'>('idle')
  const [matchedSlug, setMatchedSlug] = useState<string | null>(null)
  const [useSmartMode, setUseSmartMode] = useState(false)
  const smartDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const debounce = useCallback((fn: () => void) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(fn, 300)
  }, [])

  const fetchIndustrySuggestions = async (q: string) => {
    if (!q || q.length < 2) {
      setAiStatus('idle')
      setMatchedSlug(null)
      return
    }
    setAiStatus('loading')
    try {
      const res = await fetch(`/api/contacts/industry-suggestions?q=${encodeURIComponent(q)}`)
      const data: SuggestionResponse = await res.json()
      if (data.fallback || !data.matchedSlug) {
        setAiStatus('fallback')
        setMatchedSlug(null)
        // Don't update filter, show dropdown instead
      } else {
        setAiStatus('matched')
        setMatchedSlug(data.matchedSlug)
        setFilter({ industry: data.matchedSlug, page: 1 })
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
    setFilter({ industry: '', page: 1 })
  }

  return (
    <div className="flex flex-wrap gap-3 mb-4 items-end">
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
            <Input
              type="text"
              placeholder="Ketik industri bebas..."
              value={smartQuery}
              onChange={(e) => handleSmartQueryChange(e.target.value)}
              className="h-9 pr-8"
            />
            {aiStatus === 'loading' && (
              <span className="absolute right-2 top-2 text-xs text-muted-foreground">⏳</span>
            )}
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
                <select
                  value={industry}
                  onChange={(e) => setFilter({ industry: e.target.value, page: 1 })}
                  className={`${nativeSelectClass} mt-1`}
                >
                  {INDUSTRIES.map((i) => (
                    <option key={i.value} value={i.value}>{i.label}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        ) : (
          <select
            value={industry}
            onChange={(e) => debounce(() => setFilter({ industry: e.target.value, page: 1 }))}
            className={`${nativeSelectClass} w-48`}
          >
            {INDUSTRIES.map((i) => (
              <option key={i.value} value={i.value}>{i.label}</option>
            ))}
          </select>
        )}
      </div>

      <div>
        <label className="block text-xs text-muted-foreground mb-1">Kota</label>
        <Input
          type="text"
          placeholder="Cari kota..."
          defaultValue={city}
          onChange={(e) => debounce(() => setFilter({ city: e.target.value, page: 1 }))}
          className="w-40"
        />
      </div>

      <div>
        <label className="block text-xs text-muted-foreground mb-1">Ukuran Perusahaan</label>
        <select
          value={companySize}
          onChange={(e) => debounce(() => setFilter({ companySize: e.target.value, page: 1 }))}
          className={nativeSelectClass}
        >
          {COMPANY_SIZES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      <Button variant="outline" onClick={() => { resetFilter(); clearSmartFilter() }}>
        Reset Filter
      </Button>
    </div>
  )
}
