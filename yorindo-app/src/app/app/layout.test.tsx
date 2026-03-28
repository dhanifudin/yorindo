import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import AppLayout from './layout'
import { useAuthStore } from '@/store/authStore'

const mockReplace = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace, push: vi.fn() }),
  usePathname: () => '/app/users',
}))

vi.mock('@/components/layout/AdminShell', () => ({
  AdminShell: ({ children }: { children: React.ReactNode }) => <div data-testid="admin-shell">{children}</div>,
}))

vi.mock('@/components/layout/ParticipantShell', () => ({
  ParticipantShell: ({ children }: { children: React.ReactNode }) => <div data-testid="participant-shell">{children}</div>,
}))

vi.mock('@/components/features/scan/PWAInstallBanner', () => ({
  PWAInstallBanner: () => null,
}))

describe('AppLayout role guard', () => {
  beforeEach(() => {
    mockReplace.mockClear()
    useAuthStore.setState({ accessToken: null, user: null, eventKeys: {} })
  })

  it('does not render unauthorized content for staff on /app/users and redirects to /app/scan', async () => {
    useAuthStore.setState({
      accessToken: 'mock-token-staff',
      user: { id: 'staff-001', role: 'staff', name: 'Staff' },
      eventKeys: {},
    })

    const { queryByTestId } = render(
      <AppLayout>
        <div data-testid="protected-content">Protected</div>
      </AppLayout>,
    )

    expect(queryByTestId('protected-content')).toBeNull()

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/app/scan')
    })
  })

  it('refreshes once on 401 and retries the API request', async () => {
    const originalFetch = window.fetch
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
      const headers = new Headers(init?.headers)

      if (url === '/api/auth/refresh') {
        return new Response(JSON.stringify({ accessToken: 'refreshed-token' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      const authHeader = headers.get('Authorization')
      if (url === '/api/protected' && authHeader === 'Bearer refreshed-token') {
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      return new Response(JSON.stringify({ error: 'expired' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    })

    // @ts-expect-error test override
    window.fetch = fetchMock

    useAuthStore.setState({
      accessToken: 'expired-token',
      user: { id: 'admin-001', role: 'admin', name: 'Admin' },
      eventKeys: {},
    })

    render(
      <AppLayout>
        <div>Allowed</div>
      </AppLayout>,
    )

    const response = await window.fetch('/api/protected')
    expect(response.status).toBe(200)

    await waitFor(() => {
      expect(useAuthStore.getState().accessToken).toBe('refreshed-token')
    })

    expect(mockReplace).not.toHaveBeenCalled()
    expect(fetchMock).toHaveBeenCalledTimes(3)

    window.fetch = originalFetch
  })
})
