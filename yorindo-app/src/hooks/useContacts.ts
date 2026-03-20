import { useQuery } from '@tanstack/react-query'
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
}): Promise<PaginatedResponse<Contact>> {
  const url = new URL('/api/contacts', window.location.origin)
  url.searchParams.set('page', String(params.page))
  url.searchParams.set('pageSize', String(params.pageSize))
  if (params.industry) url.searchParams.set('industry', params.industry)
  if (params.city) url.searchParams.set('city', params.city)
  if (params.companySize) url.searchParams.set('companySize', params.companySize)
  if (params.flagFilter) url.searchParams.set('flagFilter', params.flagFilter)

  const res = await fetch(url.toString())
  if (!res.ok) throw new Error('Failed to fetch contacts')
  return res.json()
}

export function useContacts() {
  const { page, industry, city, companySize, flagFilter } = useFilterStore()

  return useQuery({
    queryKey: ['contacts', { page, pageSize: PAGE_SIZE, industry, city, companySize, flagFilter }],
    queryFn: () => fetchContacts({ page, pageSize: PAGE_SIZE, industry, city, companySize, flagFilter }),
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
