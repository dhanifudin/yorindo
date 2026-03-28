import { useQuery } from '@tanstack/react-query'
import type { Event } from '@/types/api'
import { useAuthStore } from '@/store/authStore'

export function useAssignedEvents() {
  const accessToken = useAuthStore((s) => s.accessToken)
  const user = useAuthStore((s) => s.user)
  return useQuery<Event[]>({
    queryKey: ['users', 'me', 'assigned-events'],
    queryFn: async () => {
      const headers: Record<string, string> = { Authorization: `Bearer ${accessToken}` }
      if (accessToken === 'dev-token' && user?.id) headers['X-User-Id'] = user.id
      const res = await fetch('/api/users/me/assigned-events', { headers })
      if (!res.ok) throw new Error('Failed to fetch assigned events')
      const body = await res.json()
      return Array.isArray(body) ? body : (body.data ?? [])
    },
    enabled: !!accessToken,
  })
}
