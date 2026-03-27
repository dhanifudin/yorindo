import { create } from 'zustand'
import type { User } from '@/types/api'

type SessionUser = Pick<User, 'id' | 'role'> & { name?: string; email?: string }
type AuthUser = SessionUser | { id: string; role: 'participant'; name?: string; email?: string }

interface AuthStore {
  accessToken: string | null
  user: AuthUser | null
  setAccessToken: (token: string, user: AuthStore['user']) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  accessToken: null,
  user: null,
  setAccessToken: (accessToken, user) => set({ accessToken, user }),
  clearAuth: () => set({ accessToken: null, user: null }),
}))
