import { describe, it, expect } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  function Wrapper({ children }: { children: React.ReactNode }) {
    return createElement(QueryClientProvider, { client }, children)
  }
  return Wrapper
}

async function fetchPublicEvent(slug: string) {
  const res = await fetch(`/api/events/public/${slug}`)
  if (res.status === 404) throw new Error('NOT_FOUND')
  if (!res.ok) throw new Error('FETCH_ERROR')
  return res.json()
}

import { useQuery } from '@tanstack/react-query'

function usePublicEvent(slug: string) {
  return useQuery({
    queryKey: ['public-event', slug],
    queryFn: () => fetchPublicEvent(slug),
    retry: false,
  })
}

describe('public event endpoint', () => {
  it('GET /api/events/public/:slug returns the published event', async () => {
    const { result } = renderHook(
      () => usePublicEvent('seminar-erp-jakarta'),
      { wrapper: makeWrapper() }
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true), { timeout: 3000 })

    expect(result.current.data?.slug).toBe('seminar-erp-jakarta')
    expect(result.current.data?.status).toBe('published')
  })

  it('returns 404 error for unknown slug', async () => {
    const { result } = renderHook(
      () => usePublicEvent('slug-tidak-ada'),
      { wrapper: makeWrapper() }
    )

    await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 3000 })

    expect((result.current.error as Error).message).toBe('NOT_FOUND')
  })

  it('returns sponsors array for event-001 (seminar-erp-jakarta)', async () => {
    const { result } = renderHook(
      () => usePublicEvent('seminar-erp-jakarta'),
      { wrapper: makeWrapper() }
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true), { timeout: 3000 })

    expect(result.current.data?.sponsors).toHaveLength(2)
    expect(result.current.data?.sponsors[0]).toHaveProperty('name')
    expect(result.current.data?.sponsors[0]).toHaveProperty('tier')
    expect(result.current.data?.sponsors[0]).toHaveProperty('display_order')
  })

  it('returns empty sponsors array for events with no sponsors', async () => {
    const { result } = renderHook(
      () => usePublicEvent('forum-kesehatan-digital-surabaya'),
      { wrapper: makeWrapper() }
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true), { timeout: 3000 })

    expect(result.current.data?.sponsors).toHaveLength(0)
  })
})
