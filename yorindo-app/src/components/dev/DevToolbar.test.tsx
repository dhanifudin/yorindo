import { describe, it, expect, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { createElement } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { DevToolbar } from './DevToolbar'
import { useAuthStore } from '@/store/authStore'

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  function Wrapper({ children }: { children: React.ReactNode }) {
    return createElement(QueryClientProvider, { client }, children)
  }
  return Wrapper
}

describe('DevToolbar', () => {
  beforeEach(() => {
    // Reset auth store before each test
    useAuthStore.getState().clearAuth()
  })

  it('renders DEV button when mocks are enabled in test env', () => {
    // This test env has NEXT_PUBLIC_ENABLE_MOCKS or NODE_ENV=development set
    const { container } = render(<DevToolbar />, { wrapper: makeWrapper() })
    const button = container.querySelector('button')
    expect(button).not.toBeNull()
    expect(button).toHaveTextContent('DEV')
  })
})

describe('DevToolbar store integration', () => {
  beforeEach(() => {
    useAuthStore.getState().clearAuth()
  })

  it('setAuth updates user with dev-staff role', () => {
    const { setAuth } = useAuthStore.getState()
    setAuth('dev-token', { id: 'cuid2devstaffuser0000001', role: 'staff' })
    const { user } = useAuthStore.getState()
    expect(user).toEqual({ id: 'cuid2devstaffuser0000001', role: 'staff' })
  })

  it('clearAuth removes user and token', () => {
    const { setAuth, clearAuth } = useAuthStore.getState()
    setAuth('dev-token', { id: 'cuid2devadminuser0000001', role: 'admin' })
    clearAuth()
    const { user, accessToken } = useAuthStore.getState()
    expect(user).toBeNull()
    expect(accessToken).toBeNull()
  })
})
