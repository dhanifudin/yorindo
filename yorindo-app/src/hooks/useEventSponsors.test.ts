import { describe, it, expect } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import { useEventSponsors, useAttachSponsor } from './useEventSponsors'

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client }, children)
}

describe('useEventSponsors', () => {
  it('returns 2 seeded sponsors for event-001', async () => {
    const { result } = renderHook(() => useEventSponsors('event-001'), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true), { timeout: 3000 })

    expect(result.current.data).toHaveLength(2)
    expect(result.current.data?.[0].vendor_name).toBe('Alibaba Cloud')
    expect(result.current.data?.[0].tier).toBe('premium')
  })

  it('returns empty array for event-002 (no sponsors)', async () => {
    const { result } = renderHook(() => useEventSponsors('event-002'), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true), { timeout: 3000 })

    expect(result.current.data).toHaveLength(0)
  })

  it('returns sponsors with all required fields', async () => {
    const { result } = renderHook(() => useEventSponsors('event-001'), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true), { timeout: 3000 })

    const sponsor = result.current.data?.[0]
    expect(sponsor).toHaveProperty('id')
    expect(sponsor).toHaveProperty('event_id', 'event-001')
    expect(sponsor).toHaveProperty('vendor_id')
    expect(sponsor).toHaveProperty('vendor_name')
    expect(sponsor).toHaveProperty('tier')
    expect(sponsor).toHaveProperty('display_order')
  })
})

describe('useAttachSponsor', () => {
  it('attaches a new vendor sponsor to an event', async () => {
    const wrapper = makeWrapper()
    const { result } = renderHook(() => useAttachSponsor('event-002'), { wrapper })

    act(() => {
      result.current.mutate({ vendorId: 'vendor-002', tier: 'standard' })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true), { timeout: 3000 })

    expect(result.current.data?.vendor_id).toBe('vendor-002')
    expect(result.current.data?.tier).toBe('standard')
    expect(result.current.data?.event_id).toBe('event-002')
  })
})
