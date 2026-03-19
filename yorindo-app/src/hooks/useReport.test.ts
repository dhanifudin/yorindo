import { describe, it, expect } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import { useReport } from './useReport'

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client }, children)
}

describe('useReport', () => {
  it('returns seeded report data from MSW', async () => {
    const { result } = renderHook(
      () => useReport('event-001'),
      { wrapper: makeWrapper() }
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true), { timeout: 3000 })

    expect(result.current.data?.totalInvited).toBe(500)
    expect(result.current.data?.registered).toBe(180)
    expect(result.current.data?.attended).toBe(95)
  })

  it('computes attendance and no-show rates', async () => {
    const { result } = renderHook(
      () => useReport('event-001'),
      { wrapper: makeWrapper() }
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true), { timeout: 3000 })

    const attendanceRate = parseFloat(result.current.data?.attendanceRate ?? '0')
    // 95/120 * 100 = 79.2
    expect(attendanceRate).toBeCloseTo(79.2, 0)
  })
})
