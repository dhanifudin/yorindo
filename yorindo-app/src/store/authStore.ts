import { create } from 'zustand'
import type { User } from '@/types/api'

type SessionUser = Pick<User, 'id' | 'role'> & { name?: string; email?: string }
type AuthUser = SessionUser | { id: string; role: 'participant'; name?: string; email?: string }

interface AuthStore {
  accessToken: string | null
  user: AuthUser | null
  eventKeys: Record<string, string>
  setAuth: (token: string, user: AuthStore['user'], eventKeys?: Record<string, string>) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  accessToken: null,
  user: null,
  eventKeys: {},
  setAuth: (accessToken, user, eventKeys = {}) => set({ accessToken, user, eventKeys }),
  clearAuth: () => set({ accessToken: null, user: null, eventKeys: {} }),
}))
