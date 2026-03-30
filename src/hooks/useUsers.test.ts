import { describe, it, expect } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import { useUsers, useCreateUser, useDeleteUser } from './useUsers'

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  function Wrapper({ children }: { children: React.ReactNode }) {
    return createElement(QueryClientProvider, { client }, children)
  }
  return Wrapper
}

describe('useUsers', () => {
  it('returns seeded users from MSW', async () => {
    const { result } = renderHook(() => useUsers(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true), { timeout: 3000 })
    expect(result.current.data?.data.length).toBeGreaterThanOrEqual(3)
  })

  it('includes all three roles in seeded data', async () => {
    const { result } = renderHook(() => useUsers(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true), { timeout: 3000 })
    const roles = result.current.data!.data.map((u) => u.role)
    expect(roles).toContain('admin')
    expect(roles).toContain('staff')
    expect(roles).toContain('viewer')
  })
})

describe('useCreateUser', () => {
  it('creates a new user with 201 status', async () => {
    const wrapper = makeWrapper()
    const { result } = renderHook(() => useCreateUser(), { wrapper })
    result.current.mutate({
      name: 'Test User',
      email: 'test@yorindo.app',
      role: 'staff',
      password: 'Password123!',
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true), { timeout: 3000 })
    expect(result.current.data?.email).toBe('test@yorindo.app')
    expect(result.current.data?.role).toBe('staff')
  })
})

describe('role guard logic', () => {
  it('viewer is allowed on /admin/events', () => {
    const VIEWER_ALLOWED = ['/admin', '/admin/events']
    const isViewerAllowed = (pathname: string) => {
      if (VIEWER_ALLOWED.includes(pathname)) return true
      if (/^\/admin\/events\/[^/]+\/report/.test(pathname)) return true
      if (/^\/admin\/events\/[^/]+$/.test(pathname)) return true
      return false
    }
    expect(isViewerAllowed('/admin')).toBe(true)
    expect(isViewerAllowed('/admin/events')).toBe(true)
    expect(isViewerAllowed('/admin/events/event-001/report')).toBe(true)
    expect(isViewerAllowed('/admin/contacts')).toBe(false)
    expect(isViewerAllowed('/admin/users')).toBe(false)
    expect(isViewerAllowed('/admin/templates')).toBe(false)
  })
})
