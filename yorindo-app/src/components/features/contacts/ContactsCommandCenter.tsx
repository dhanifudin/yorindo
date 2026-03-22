'use client'

import { useState, useCallback, useEffect } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { useContacts } from '@/hooks/useContacts'
import { useFilterStore } from '@/store/filterStore'
import { Button } from '@/components/ui/button'
import { HealthBar } from './HealthBar'
import { EventBanner } from './EventBanner'
import { ContactsFilterBar } from './ContactsFilterBar'
import { ActiveFilterPills } from './ActiveFilterPills'
import { TriagePanel } from './TriagePanel'
import { ContactsTable } from './ContactsTable'
import { ContactsPagination } from './ContactsPagination'
import { ActionToolbar } from './ActionToolbar'

const FILTER_KEYS = ['industry', 'city', 'companySize', 'q', 'missingEmail']

export function ContactsCommandCenter() {
  const [triageMode, setTriageMode] = useState<'flagged' | 'duplicates' | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [selectMode, setSelectMode] = useState(false)
  const [resetKey, setResetKey] = useState(0)
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const { setFilter } = useFilterStore()
  const { data: contacts } = useContacts()

  const hasFilters = FILTER_KEYS.some((k) => !!searchParams.get(k))

  const handleSelectionChange = useCallback((ids: string[]) => {
    setSelectedIds(ids)
  }, [])

  const handleClearSelection = useCallback(() => {
    setSelectedIds([])
    setResetKey((k) => k + 1)
  }, [])

  const handleToggleSelectMode = useCallback(() => {
    const next = !selectMode
    setSelectMode(next)
    if (!next) handleClearSelection()
  }, [selectMode, handleClearSelection])

  // Reset selection on page change
  const page = searchParams.get('page')
  useEffect(() => {
    handleClearSelection()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  const handleStatClick = (type: 'flagged' | 'duplicates' | 'missingEmail') => {
    if (type === 'missingEmail') {
      const params = new URLSearchParams(searchParams.toString())
      if (params.get('missingEmail') === 'true') {
        params.delete('missingEmail')
        setFilter({ missingEmail: false })
      } else {
        params.set('missingEmail', 'true')
        params.delete('page')
        setFilter({ missingEmail: true })
      }
      router.push(`${pathname}?${params.toString()}`)
    } else {
      setTriageMode(type)
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Database Kontak</h1>
        <Button
          variant={selectMode ? 'default' : 'outline'}
          size="sm"
          className="hidden md:inline-flex"
          onClick={handleToggleSelectMode}
        >
          {selectMode ? 'Batal Pilih' : 'Pilih'}
        </Button>
      </div>

      <HealthBar onStatClick={handleStatClick} />
      <EventBanner />

      <ContactsFilterBar />
      <ActiveFilterPills total={contacts?.pagination.total} />
      <TriagePanel
        mode={triageMode}
        onClose={() => setTriageMode(null)}
      />
      <ContactsTable
        key={resetKey}
        onSelectionChange={handleSelectionChange}
        onToggleSelectMode={handleToggleSelectMode}
        selectMode={selectMode}
        selectedIds={selectedIds}
      />
      <ContactsPagination />
      <ActionToolbar
        total={contacts?.pagination.total ?? 0}
        searchParams={searchParams}
        isVisible={hasFilters || selectedIds.length > 0}
        selectedIds={selectedIds}
        onClearSelection={handleClearSelection}
      />
    </div>
  )
}
