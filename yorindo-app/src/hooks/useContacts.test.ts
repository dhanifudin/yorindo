import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import { useContacts } from './useContacts'

// Mock next/navigation with a configurable search params map
const mockSearchParams = new URLSearchParams()

vi.mock('next/navigation', () => ({
  useSearchParams: () => mockSearchParams,
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/app/contacts',
}))

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  function Wrapper({ children }: { children: React.ReactNode }) {
    return createElement(QueryClientProvider, { client }, children)
  }
  return Wrapper
}

beforeEach(() => {
  // Reset URL params before each test
  mockSearchParams.delete('industry')
  mockSearchParams.delete('city')
  mockSearchParams.delete('companySize')
  mockSearchParams.delete('page')
  mockSearchParams.delete('q')
  mockSearchParams.delete('missingEmail')
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

  it('fetches with industry filter when set in URL params', async () => {
    mockSearchParams.set('industry', 'teknologi')

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
