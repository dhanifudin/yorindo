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

})
