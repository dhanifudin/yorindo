import { describe, it, expect } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import { useEvents, useCreateEvent } from './useEvents'

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  function Wrapper({ children }: { children: React.ReactNode }) {
    return createElement(QueryClientProvider, { client }, children)
  }
  return Wrapper
}

describe('useEvents', () => {
  it('returns 6 seeded events from MSW', async () => {
    const { result } = renderHook(() => useEvents(), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true), { timeout: 3000 })

    expect(result.current.data?.data).toHaveLength(6)
  })

  it('includes events with all expected statuses', async () => {
    const { result } = renderHook(() => useEvents(), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true), { timeout: 3000 })

    const statuses = result.current.data?.data.map((e) => e.status)
    expect(statuses).toContain('draft')
    expect(statuses).toContain('published')
    expect(statuses).toContain('active')
    expect(statuses).toContain('completed')
    expect(statuses).toContain('cancelled')
  })
})

describe('useCreateEvent', () => {
  it('creates a new event with status draft', async () => {
    const wrapper = makeWrapper()
    const { result } = renderHook(() => useCreateEvent(), { wrapper })

    result.current.mutate({
      name: 'Test Event',
      eventDate: '2026-06-01T09:00:00.000Z',
      timezone: 'Asia/Jakarta',
      capacity: 50,
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true), { timeout: 3000 })

    expect(result.current.data?.name).toBe('Test Event')
    expect(result.current.data?.status).toBe('draft')
  })
})
