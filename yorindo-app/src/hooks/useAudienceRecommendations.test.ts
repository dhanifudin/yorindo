import { describe, it, expect } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import { useAudienceRecommendations } from './useEvents'

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client }, children)
}

describe('useAudienceRecommendations', () => {
  it('returns AudienceRecommendationsResponse shape', async () => {
    const { result } = renderHook(() => useAudienceRecommendations('event-001', true), {
      wrapper: makeWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true), { timeout: 3000 })

    const data = result.current.data
    expect(data).toBeDefined()
    expect(Array.isArray(data?.recommendations)).toBe(true)
    expect(typeof data?.totalMatched).toBe('number')
    expect(typeof data?.totalExcluded).toBe('number')
    expect(typeof data?.excludedReasons).toBe('object')
  })

  it('recommendations are sorted by score descending', async () => {
    const { result } = renderHook(() => useAudienceRecommendations('event-001', true), {
      wrapper: makeWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true), { timeout: 3000 })

    const recs = result.current.data?.recommendations ?? []
    for (let i = 1; i < recs.length; i++) {
      expect(recs[i - 1].score).toBeGreaterThanOrEqual(recs[i].score)
    }
  })

  it('does not include not-potential or spam contacts', async () => {
    const { result } = renderHook(() => useAudienceRecommendations('event-001', true), {
      wrapper: makeWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true), { timeout: 3000 })

    // The MSW handler excludes flagCategory === 'not-potential' | 'spam'
    // Verify excluded count is populated
    const data = result.current.data
    expect(data?.totalExcluded).toBeGreaterThan(0)
    expect(Object.keys(data?.excludedReasons ?? {})).not.toHaveLength(0)
  })

  it('does not fetch when enabled is false', () => {
    const { result } = renderHook(() => useAudienceRecommendations('event-001', false), {
      wrapper: makeWrapper(),
    })

    expect(result.current.isLoading).toBe(false)
    expect(result.current.isFetching).toBe(false)
    expect(result.current.data).toBeUndefined()
  })
})
