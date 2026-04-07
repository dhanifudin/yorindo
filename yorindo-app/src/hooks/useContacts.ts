'use client'

import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'next/navigation'
import { useFilterStore } from '@/store/filterStore'
import type { Contact, PaginatedResponse, RecommendedEventsResponse } from '@/types/api'

const PAGE_SIZE = 20

async function fetchContacts(params: {
  page: number
  pageSize: number
  industry: string
  city: string
  companySize: string
  flagFilter: string
  missingEmail: boolean
  missingPhone: boolean
  q: string
}): Promise<PaginatedResponse<Contact>> {
  const qs = new URLSearchParams()
  qs.set('page', String(params.page))
  qs.set('pageSize', String(params.pageSize))
  if (params.industry) qs.set('industry', params.industry)
  if (params.city) qs.set('city', params.city)
  if (params.companySize) qs.set('companySize', params.companySize)
  if (params.flagFilter) qs.set('flagFilter', params.flagFilter)
  if (params.missingEmail) qs.set('missingEmail', 'true')
  if (params.missingPhone) qs.set('missingPhone', 'true')
  if (params.q) qs.set('q', params.q)

  const res = await fetch(`/api/contacts?${qs.toString()}`)
  if (!res.ok) throw new Error('Failed to fetch contacts')
  return res.json()
}

export function useContacts() {
  const searchParams = useSearchParams()
  const { industry: storeIndustry, city: storeCity, companySize: storeCompanySize, page: storePage, flagFilter, missingEmail, missingPhone } = useFilterStore()

  const industry = storeIndustry || searchParams.get('industry') || ''
  const city = storeCity || searchParams.get('city') || ''
  const companySize = storeCompanySize || searchParams.get('companySize') || ''
  const page = storePage || parseInt(searchParams.get('page') ?? '1', 10)
  const q = searchParams.get('q') ?? ''

  return useQuery({
    queryKey: ['contacts', { page, pageSize: PAGE_SIZE, industry, city, companySize, flagFilter, missingEmail, missingPhone, q }],
    queryFn: () => fetchContacts({ page, pageSize: PAGE_SIZE, industry, city, companySize, flagFilter, missingEmail, missingPhone, q }),
  })
}

export function useRecommendedEvents(contactId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['recommended-events', contactId],
    queryFn: () =>
      fetch(`/api/contacts/${contactId}/recommended-events`)
        .then((r) => r.json()) as Promise<RecommendedEventsResponse>,
    enabled: !!contactId && enabled,
    staleTime: 5 * 60 * 1000,
  })
}
