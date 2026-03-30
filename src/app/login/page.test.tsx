import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import LoginPage from './page'
import { useAuthStore } from '@/store/authStore'

const mockReplace = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace, push: vi.fn() }),
}))

// Stub LoginForm to keep test focused on redirect logic
vi.mock('@/components/forms/LoginForm', () => ({
  LoginForm: () => <div data-testid="login-form">LoginForm</div>,
}))

beforeEach(() => {
  mockReplace.mockClear()
  useAuthStore.setState({ accessToken: null, user: null })
})

describe('LoginPage', () => {
  it('renders the login form when not authenticated', () => {
    render(<LoginPage />)
    expect(screen.getByTestId('login-form')).toBeTruthy()
    expect(screen.getByText('Admin Portal')).toBeTruthy()
  })

  it('redirects to /app when already authenticated', async () => {
    useAuthStore.setState({
      accessToken: 'existing-token',
      user: { id: 'u1', role: 'admin' },
    })
    render(<LoginPage />)

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/app')
    })
  })

  it('does not render form when already authenticated', async () => {
    useAuthStore.setState({
      accessToken: 'existing-token',
      user: { id: 'u1', role: 'admin' },
    })
    render(<LoginPage />)

    await waitFor(() => {
      expect(screen.queryByTestId('login-form')).toBeNull()
    })
  })
})
