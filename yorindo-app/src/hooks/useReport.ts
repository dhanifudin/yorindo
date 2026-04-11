import { useQuery } from '@tanstack/react-query'

export interface EventReport {
  eventId: string
  totalInvited: number
  registered: number
  approved: number
  attended: number
  attendanceRate: string
  noShowRate: string
  industryBreakdown: Array<{ industry: string; count: number }>
  cityBreakdown: Array<{ city: string; count: number }>
  jobTitleBreakdown: Array<{ level: string; count: number }>
}

async function fetchReport(eventId: string): Promise<EventReport> {
  const res = await fetch(`/api/events/${eventId}/report`)
  if (!res.ok) throw new Error('Failed to fetch report')
  return res.json()
}

export function useReport(eventId: string | undefined) {
  return useQuery({
    queryKey: ['report', eventId],
    queryFn: () => fetchReport(eventId!),
    enabled: !!eventId,
  })
}
