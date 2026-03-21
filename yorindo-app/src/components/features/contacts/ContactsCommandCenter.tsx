'use client'

import { useState } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { useContacts } from '@/hooks/useContacts'
import { useFilterStore } from '@/store/filterStore'
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
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const { setFilter } = useFilterStore()
  const { data: contacts } = useContacts()

  const hasFilters = FILTER_KEYS.some((k) => !!searchParams.get(k))

  const handleStatClick = (type: 'flagged' | 'duplicates' | 'missingEmail') => {
    if (type === 'missingEmail') {
      // Toggle missingEmail URL param
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
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Database Kontak</h1>

      <HealthBar onStatClick={handleStatClick} />
      <EventBanner />

      <ContactsFilterBar />
      <ActiveFilterPills total={contacts?.pagination.total} />
      <TriagePanel
        mode={triageMode}
        onClose={() => setTriageMode(null)}
      />
      <ContactsTable />
      <ContactsPagination />
      <ActionToolbar
        total={contacts?.pagination.total ?? 0}
        searchParams={searchParams}
        isVisible={hasFilters}
      />
    </div>
  )
}
