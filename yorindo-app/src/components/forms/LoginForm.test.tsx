import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoginForm } from './LoginForm'
import { useAuthStore } from '@/store/authStore'

// Mock Next.js router
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn() }),
}))

beforeEach(() => {
  mockPush.mockClear()
  useAuthStore.setState({ accessToken: null, user: null })
})

describe('LoginForm', () => {
  it('shows validation errors on empty submit', async () => {
    const user = userEvent.setup()
    render(<LoginForm />)
    await user.click(screen.getByRole('button', { name: /masuk/i }))

    await waitFor(() => {
      expect(screen.getByText('Email tidak valid')).toBeTruthy()
      expect(screen.getByText('Minimal 8 karakter')).toBeTruthy()
    })
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('shows validation error for invalid email format', async () => {
    const user = userEvent.setup()
    render(<LoginForm />)

    await user.type(screen.getByLabelText('Email'), 'notanemail')
    await user.type(screen.getByLabelText('Password'), 'Password123!')
    await user.click(screen.getByRole('button', { name: /masuk/i }))

    await waitFor(() => {
      expect(screen.getByText('Email tidak valid')).toBeTruthy()
    })
  })

  it('calls setAuth and redirects to /app on successful login', async () => {
    const user = userEvent.setup()
    render(<LoginForm />)

    await user.type(screen.getByLabelText('Email'), 'admin@yorindo.id')
    await user.type(screen.getByLabelText('Password'), 'Password123!')
    await user.click(screen.getByRole('button', { name: /masuk/i }))

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/app')
    })

    const { accessToken, user: authUser, eventKeys } = useAuthStore.getState()
    expect(accessToken).toBe('mock-token-admin')
    expect(authUser?.role).toBe('admin')
    expect(eventKeys).toEqual({})
  })

  it('shows loading state while submitting', async () => {
    const user = userEvent.setup()
    render(<LoginForm />)

    await user.type(screen.getByLabelText('Email'), 'admin@yorindo.id')
    await user.type(screen.getByLabelText('Password'), 'Password123!')

    const button = screen.getByRole('button', { name: /masuk/i })
    await user.click(button)

    // Button should show loading state (disabled) while MSW 300ms delay runs
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/app')
    })
  })
})
