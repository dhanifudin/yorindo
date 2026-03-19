import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import { useContacts } from './useContacts'
import { useFilterStore } from '@/store/filterStore'

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client }, children)
}

beforeEach(() => {
  useFilterStore.setState({ industry: '', city: '', companySize: '', page: 1 })
})

describe('useContacts', () => {
  it('returns paginated contacts on page 1 (total=247)', async () => {
    const { result } = renderHook(() => useContacts(), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true), { timeout: 3000 })

    expect(result.current.data?.data).toHaveLength(20)
    expect(result.current.data?.pagination.total).toBe(247)
    expect(result.current.data?.pagination.page).toBe(1)
    expect(result.current.data?.pagination.pageSize).toBe(20)
  })

  it('fetches with industry filter when set in filterStore', async () => {
    useFilterStore.setState({ industry: 'teknologi', city: '', companySize: '', page: 1 })

    const { result } = renderHook(() => useContacts(), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true), { timeout: 3000 })

    // Filtered data should have fewer contacts than total 247
    expect(result.current.data?.pagination.total).toBeLessThan(247)
    // All returned contacts should match the industry filter
    result.current.data?.data.forEach((c) => {
      expect(c.industryId).toBe('teknologi')
    })
  })

  it('returns correct totalPages for default page size', async () => {
    const { result } = renderHook(() => useContacts(), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true), { timeout: 3000 })

    // 247 contacts / 20 per page = 13 pages (ceil)
    expect(result.current.data?.pagination.totalPages).toBe(13)
  })
})
