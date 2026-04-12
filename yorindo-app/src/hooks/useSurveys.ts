import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { SurveySchema, SurveyResponsesApiResponse } from '@/types/surveys'
import { getUserFriendlyError } from '@/lib/error-messages'

// Load a survey schema by type
export function useSurveySchema(eventId: string | undefined, type: 'registration' | 'post-event') {
  return useQuery({
    queryKey: ['surveys', eventId, type],
    queryFn: async () => {
      const res = await fetch(`/api/events/${eventId}/surveys/${type}`)
      if (!res.ok) throw new Error('Gagal memuat skema survei')
      return res.json() as Promise<SurveySchema>
    },
    enabled: !!eventId,
    staleTime: 2 * 60 * 1000,
  })
}

// Save a survey schema
export function useSaveSurveySchema(eventId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ type, schema, uiSchema }: { type: 'registration' | 'post-event'; schema: unknown; uiSchema: unknown }) => {
      const res = await fetch(`/api/events/${eventId}/surveys/${type}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schema, uiSchema }),
      })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData?.message || `Gagal menyimpan survei: ${res.status} ${res.statusText}`)
      }
      return res.json()
    },
    onSuccess: (_, { type }) => {
      queryClient.invalidateQueries({ queryKey: ['surveys', eventId, type] })
      queryClient.invalidateQueries({ queryKey: ['events', eventId] })
      toast.success('Survei berhasil disimpan')
    },
    onError: (error) => {
      toast.error(getUserFriendlyError(error))
    }
  })
}

// Load survey responses
export function useSurveyResponses(
  eventId: string | undefined,
  type: 'registration' | 'post-event',
  search?: string
) {
  return useQuery({
    queryKey: ['survey-responses', eventId, { type, search }],
    queryFn: async () => {
      const res = await fetch(`/api/events/${eventId}/surveys/responses?type=${type}${search ? `&search=${encodeURIComponent(search)}` : ''}`)
      if (!res.ok) throw new Error('Gagal memuat respons survei')
      return res.json() as Promise<SurveyResponsesApiResponse>
    },
    enabled: !!eventId,
    staleTime: 60 * 1000,
  })
}
