import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { AttachSponsorBody, EventSponsor } from '@/types/api'

async function fetchSponsors(eventId: string): Promise<EventSponsor[]> {
  const res = await fetch(`/api/events/${eventId}/sponsors`)
  if (!res.ok) throw new Error('Failed to fetch sponsors')
  return res.json()
}

async function attachSponsor(eventId: string, body: AttachSponsorBody): Promise<EventSponsor> {
  const res = await fetch(`/api/events/${eventId}/sponsors`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error('Failed to attach sponsor')
  return res.json()
}

async function updateSponsorTier(
  eventId: string,
  vendorId: string,
  tier: EventSponsor['tier']
): Promise<EventSponsor> {
  const res = await fetch(`/api/events/${eventId}/sponsors/${vendorId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tier }),
  })
  if (!res.ok) throw new Error('Failed to update sponsor tier')
  return res.json()
}

async function removeSponsor(eventId: string, vendorId: string): Promise<void> {
  const res = await fetch(`/api/events/${eventId}/sponsors/${vendorId}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error('Failed to remove sponsor')
}

export function useEventSponsors(eventId: string) {
  return useQuery({
    queryKey: ['event-sponsors', eventId],
    queryFn: () => fetchSponsors(eventId),
    enabled: !!eventId,
  })
}

export function useAttachSponsor(eventId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: AttachSponsorBody) => attachSponsor(eventId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-sponsors', eventId] })
    },
  })
}

export function useUpdateSponsorTier(eventId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ vendorId, tier }: { vendorId: string; tier: EventSponsor['tier'] }) =>
      updateSponsorTier(eventId, vendorId, tier),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-sponsors', eventId] })
    },
  })
}

export function useRemoveSponsor(eventId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vendorId: string) => removeSponsor(eventId, vendorId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-sponsors', eventId] })
    },
  })
}
