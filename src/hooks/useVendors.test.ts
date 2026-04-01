import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import { useVendors, useCreateVendor, useDeleteVendor } from './useVendors'
import { vendorsStore } from '@/mocks/handlers/vendors'

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  function Wrapper({ children }: { children: React.ReactNode }) {
    return createElement(QueryClientProvider, { client }, children)
  }
  return Wrapper
}

describe('useVendors', () => {
  it('returns 4 seeded vendors from MSW', async () => {
    const { result } = renderHook(() => useVendors(), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true), { timeout: 3000 })

    expect(result.current.data?.data).toHaveLength(4)
  })

  it('returns vendors with required fields', async () => {
    const { result } = renderHook(() => useVendors(), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true), { timeout: 3000 })

    const vendor = result.current.data?.data[0]
    expect(vendor).toHaveProperty('id')
    expect(vendor).toHaveProperty('name')
    expect(vendor).toHaveProperty('contact_email')
    expect(vendor).toHaveProperty('linked_event_count')
  })

  it('includes vendors from different industries', async () => {
    const { result } = renderHook(() => useVendors(), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true), { timeout: 3000 })

    const industries = result.current.data?.data.map((v) => v.industry)
    expect(industries).toContain('teknologi')
    expect(industries).toContain('keuangan')
    expect(industries).toContain('manufaktur')
  })
})

describe('useCreateVendor', () => {
  it('creates a new vendor and it appears in the store', async () => {
    const wrapper = makeWrapper()
    const { result } = renderHook(() => useCreateVendor(), { wrapper })

    act(() => {
      result.current.mutate({
        name: 'Google Indonesia',
        contact_email: 'google-id@google.com',
        industry: 'teknologi',
      })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true), { timeout: 3000 })

    expect(result.current.data?.name).toBe('Google Indonesia')
    expect(result.current.data?.contact_email).toBe('google-id@google.com')
    expect(result.current.data?.linked_event_count).toBe(0)
  })
})

describe('useDeleteVendor', () => {
  it('fails with 409 error message when vendor has linked events', async () => {
    // vendor-001 has linked_event_count: 2
    const linkedVendor = vendorsStore.find((v) => v.linked_event_count > 0)
    expect(linkedVendor).toBeDefined()

    const wrapper = makeWrapper()
    const { result } = renderHook(() => useDeleteVendor(), { wrapper })

    act(() => {
      result.current.mutate(linkedVendor!.id)
    })

    await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 3000 })

    expect((result.current.error as Error).message).toContain('terhubung ke')
  })

  it('successfully deletes a vendor with no linked events', async () => {
    // vendor-004 (Siemens) has linked_event_count: 0
    const unlinkedVendor = vendorsStore.find((v) => v.linked_event_count === 0)
    expect(unlinkedVendor).toBeDefined()

    const wrapper = makeWrapper()
    const { result } = renderHook(() => useDeleteVendor(), { wrapper })

    act(() => {
      result.current.mutate(unlinkedVendor!.id)
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true), { timeout: 3000 })
  })
})
