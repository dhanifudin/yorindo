import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { AudienceRecommendationsResponse, Event, PaginatedResponse, CreateEventBody } from '@/types/api'

async function updateEvent(id: string, body: Partial<CreateEventBody>): Promise<Event> {
  const res = await fetch(`/api/events/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error('Failed to update event')
  return res.json()
}

async function fetchEvents(): Promise<PaginatedResponse<Event>> {
  const res = await fetch('/api/events?pageSize=50')
  if (!res.ok) throw new Error('Failed to fetch events')
  return res.json()
}

async function createEvent(body: CreateEventBody): Promise<Event> {
  const res = await fetch('/api/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error('Failed to create event')
  return res.json()
}

async function fetchEvent(id: string): Promise<Event> {
  const res = await fetch(`/api/events/${id}`)
  if (!res.ok) throw new Error('Failed to fetch event')
  return res.json()
}

export function useEvents() {
  return useQuery({
    queryKey: ['events'],
    queryFn: fetchEvents,
  })
}

export function useEvent(id: string) {
  return useQuery({
    queryKey: ['events', id],
    queryFn: () => fetchEvent(id),
    enabled: !!id,
  })
}

export function useCreateEvent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
    },
  })
}

export function useUpdateEvent(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: Partial<CreateEventBody>) => updateEvent(id, body),
    onSuccess: (updated) => {
      queryClient.setQueryData(['events', id], updated)
      queryClient.invalidateQueries({ queryKey: ['events'] })
    },
  })
}

export function useAudienceRecommendations(eventId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['audience-recommendations', eventId],
    queryFn: () =>
      fetch(`/api/events/${eventId}/audience-recommendations`)
        .then((r) => r.json()) as Promise<AudienceRecommendationsResponse>,
    enabled: !!eventId && enabled,
    staleTime: 5 * 60 * 1000,
  })
}
