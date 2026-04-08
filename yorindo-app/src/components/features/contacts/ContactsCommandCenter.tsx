'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import type { RowSelectionState } from '@tanstack/react-table'
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
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [selectMode, setSelectMode] = useState(false)
  const [blastModalOpen, setBlastModalOpen] = useState(false)

  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { setFilter } = useFilterStore()
  const { data: contacts } = useContacts()

  const hasFilters = ['serviceType', 'city', 'jobTitle', 'q', 'missingEmail', 'missingPhone', 'flagFilter']
    .some((k) => !!searchParams.get(k))

  // Derive selectedIds/Names directly from rowSelection + current page data
  const selectedIds = useMemo(
    () => (contacts?.data ?? []).filter((c) => rowSelection[c.id]).map((c) => c.id),
    [rowSelection, contacts?.data]
  )
  const selectedNames = useMemo(
    () => (contacts?.data ?? []).filter((c) => rowSelection[c.id]).map((c) => c.name),
    [rowSelection, contacts?.data]
  )

  const handleClearSelection = useCallback(() => {
    setRowSelection({})
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
    setRowSelection({})
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
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
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
        const serviceType = searchParams.get('serviceType')
        const city = searchParams.get('city')
        const jobTitle = searchParams.get('jobTitle')
        const q = searchParams.get('q')

        // Filters that the blast API supports directly
        const segmentFilters = {
          ...(serviceType ? { serviceTypes: [serviceType] } : {}),
          ...(city ? { cities: [city] } : {}),
          ...(jobTitle ? { jobTitles: [jobTitle] } : {}),
        }

        // If q (name search) or other unmappable filters are active in segment
        // mode, resolve to visible contact IDs so the blast respects them
        const hasUnmappableFilter = !!q
        const pageContactIds = (contacts?.data ?? []).map((c) => c.id)
        const pageContactNames = (contacts?.data ?? []).map((c) => c.name)

        const effectiveIsSelection = selectedIds.length > 0 || hasUnmappableFilter
        const effectiveIds = selectedIds.length > 0 ? selectedIds : hasUnmappableFilter ? pageContactIds : []
        const effectiveNames = selectedIds.length > 0 ? selectedNames : hasUnmappableFilter ? pageContactNames : []

        return (
          <BlastModal
            open={blastModalOpen}
            onClose={() => setBlastModalOpen(false)}
            onBlastSuccess={handleClearSelection}
            recipientCount={effectiveIsSelection ? effectiveIds.length : (contacts?.pagination.total ?? 0)}
            mode={effectiveIsSelection ? 'selection' : 'segment'}
            selectedIds={effectiveIds}
            selectedNames={effectiveNames}
            segmentFilters={effectiveIsSelection ? undefined : segmentFilters}
          />
        )
      })()}
    </div>
  )
}