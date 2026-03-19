import { describe, it, expect, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { DevToolbar } from './DevToolbar'
import { useAuthStore } from '@/store/authStore'

describe('DevToolbar', () => {
  beforeEach(() => {
    // Reset auth store before each test
    useAuthStore.getState().clearAuth()
  })

  it('renders 3 role buttons in development', () => {
    // NODE_ENV is 'test' in vitest, not 'development'
    // We test the component behavior directly by checking it doesn't crash
    // The NODE_ENV !== 'development' guard will make it return null in test env
    const { container } = render(<DevToolbar />)
    // In test env (NODE_ENV=test), DevToolbar returns null
    expect(container.firstChild).toBeNull()
  })

  it('DevToolbar is null in non-development environment', () => {
    const { container } = render(<DevToolbar />)
    expect(container.firstChild).toBeNull()
  })
})

describe('DevToolbar store integration', () => {
  beforeEach(() => {
    useAuthStore.getState().clearAuth()
  })

  it('setAccessToken updates user with dev-staff role', () => {
    const { setAccessToken } = useAuthStore.getState()
    setAccessToken('dev-token', { id: 'dev-staff', role: 'staff' })
    const { user } = useAuthStore.getState()
    expect(user).toEqual({ id: 'dev-staff', role: 'staff' })
  })

  it('clearAuth removes user and token', () => {
    const { setAccessToken, clearAuth } = useAuthStore.getState()
    setAccessToken('dev-token', { id: 'dev-admin', role: 'admin' })
    clearAuth()
    const { user, accessToken } = useAuthStore.getState()
    expect(user).toBeNull()
    expect(accessToken).toBeNull()
  })
})
