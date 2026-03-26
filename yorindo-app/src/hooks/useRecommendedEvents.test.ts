import { describe, it, expect } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import { useRecommendedEvents } from './useContacts'

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  function Wrapper({ children }: { children: React.ReactNode }) {
    return createElement(QueryClientProvider, { client }, children)
  }
  return Wrapper
}

describe('useRecommendedEvents', () => {
  it('returns RecommendedEventsResponse shape', async () => {
    const { result } = renderHook(
      () => useRecommendedEvents('some-contact-id', true),
      { wrapper: makeWrapper() },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true), { timeout: 3000 })

    const data = result.current.data
    expect(data).toBeDefined()
    expect(Array.isArray(data?.recommendations)).toBe(true)
    expect(typeof data?.totalMatched).toBe('number')
  })

  it('all recommended events have status published or active', async () => {
    const { result } = renderHook(
      () => useRecommendedEvents('some-contact-id', true),
      { wrapper: makeWrapper() },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true), { timeout: 3000 })

    const recs = result.current.data?.recommendations ?? []
    for (const rec of recs) {
      expect(['published', 'active']).toContain(rec.status)
    }
  })

  it('does not fetch when enabled is false', () => {
    const { result } = renderHook(
      () => useRecommendedEvents('some-contact-id', false),
      { wrapper: makeWrapper() },
    )

    expect(result.current.isLoading).toBe(false)
    expect(result.current.isFetching).toBe(false)
    expect(result.current.data).toBeUndefined()
  })
})
