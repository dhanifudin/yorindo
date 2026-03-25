import { create } from 'zustand'

interface AuthStore {
  accessToken: string | null
  user: { id: string; role: 'admin' | 'staff' | 'viewer' | 'participant'; name?: string; email?: string } | null
  setAccessToken: (token: string, user: AuthStore['user']) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  accessToken: null,
  user: null,
  setAccessToken: (accessToken, user) => set({ accessToken, user }),
  clearAuth: () => set({ accessToken: null, user: null }),
}))
