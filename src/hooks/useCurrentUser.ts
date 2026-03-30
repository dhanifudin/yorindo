import { useQuery } from '@tanstack/react-query'
import type { User } from '@/types/api'
import { useAuthStore } from '@/store/authStore'

export function useCurrentUser() {
  const accessToken = useAuthStore((s) => s.accessToken)
  const user = useAuthStore((s) => s.user)
  return useQuery<User>({
    queryKey: ['users', 'me'],
    queryFn: async () => {
      const headers: Record<string, string> = { Authorization: `Bearer ${accessToken}` }
      if (accessToken === 'dev-token' && user?.id) headers['X-User-Id'] = user.id
      const res = await fetch('/api/users/me', { headers })
      if (!res.ok) throw new Error('Failed to fetch current user')
      return res.json()
    },
    enabled: !!accessToken,
    staleTime: 5 * 60 * 1000,
  })
}
