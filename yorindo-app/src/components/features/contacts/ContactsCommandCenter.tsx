'use client'

import { useState, useCallback, useEffect } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useContacts } from '@/hooks/useContacts'
import { Button } from '@/components/ui/button'
import { useFilterStore } from '@/store/filterStore'
import { HealthBar } from './HealthBar'
import { EventBanner } from './EventBanner'
import { ContactsFilterBar } from './ContactsFilterBar'
import { ActiveFilterPills } from './ActiveFilterPills'
import { TriagePanel } from './TriagePanel'
import { ContactsTable } from './ContactsTable'
import { ContactsPagination } from './ContactsPagination'
import { ActionToolbar } from './ActionToolbar'
import { BlastModal } from './BlastModal'

export function ContactsCommandCenter() {
  const [triageMode, setTriageMode] = useState<'flagged' | 'duplicates' | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [selectedNames, setSelectedNames] = useState<string[]>([])
  const [selectMode, setSelectMode] = useState(false)
  const [resetKey, setResetKey] = useState(0)
  const [blastModalOpen, setBlastModalOpen] = useState(false)

  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { setFilter } = useFilterStore()
  const { data: contacts } = useContacts()

  const hasFilters = ['serviceType', 'city', 'jobTitle', 'q', 'missingEmail', 'missingPhone', 'flagFilter']
    .some((k) => !!searchParams.get(k))

  // Accumulate selections across pages - merge current page selection with existing
  const handleSelectionChange = useCallback((ids: string[], names: string[]) => {
    setSelectedIds((prev) => {
      // When ids is empty (deselect all on page), keep previous selections from other pages
      if (ids.length === 0 && prev.length > 0) return prev
      // Otherwise replace current page's selection, keep others
      return [...ids]
    })
    setSelectedNames(names)
  }, [])

  const handleClearSelection = useCallback(() => {
    setSelectedIds([])
    setSelectedNames([])
    setResetKey((k) => k + 1)
  }, [])

  const handleToggleSelectMode = useCallback(() => {
    const next = !selectMode
    setSelectMode(next)
    if (!next) handleClearSelection()
  }, [selectMode, handleClearSelection])

  useEffect(() => {
    setFilter({
      serviceType: searchParams.get('serviceType') ?? '',
      city: searchParams.get('city') ?? '',
      jobTitle: searchParams.get('jobTitle') ?? '',
      page: parseInt(searchParams.get('page') ?? '1', 10),
      flagFilter: (searchParams.get('flagFilter') ?? '') as '' | 'flagged' | 'unflagged',
      missingEmail: searchParams.get('missingEmail') === 'true',
      missingPhone: searchParams.get('missingPhone') === 'true',
    })
  }, [searchParams, setFilter])

  const handleStatClick = (type: 'duplicates' | 'missingEmail' | 'missingPhone') => {
    if (type === 'duplicates') {
      setTriageMode(type)
      return
    }

    const params = new URLSearchParams(searchParams.toString())
    params.delete('page')
    if (type === 'missingEmail') {
      params.set('missingEmail', 'true')
      params.delete('missingPhone')
    } else {
      params.set('missingPhone', 'true')
      params.delete('missingEmail')
    }
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
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
        onSelectionChange={handleSelectionChange}   // ← sekarang terima 2 params
        onToggleSelectMode={handleToggleSelectMode}
        selectMode={selectMode}
        selectedIds={selectedIds}
      />

      <ContactsPagination />

      <ActionToolbar
        total={contacts?.pagination.total ?? 0}
        isVisible={hasFilters || selectedIds.length > 0}
        selectedIds={selectedIds}
        selectedNames={selectedNames}
        onClearSelection={handleClearSelection}
        onOpenBlastModal={() => setBlastModalOpen(true)}
      />

      {(() => {
        const isSelection = selectedIds.length > 0
        return (
          <BlastModal
            open={blastModalOpen}
            onClose={() => setBlastModalOpen(false)}
            onBlastSuccess={handleClearSelection}
            recipientCount={isSelection ? selectedIds.length : (contacts?.pagination.total ?? 0)}
            mode={isSelection ? 'selection' : 'segment'}
            selectedIds={selectedIds}
            selectedNames={selectedNames}
          />
        )
      })()}
    </div>
  )
}