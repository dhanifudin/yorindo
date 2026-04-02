'use client'

import { use } from 'react'
import { useQuery } from '@tanstack/react-query'
import { notFound } from 'next/navigation'
import { EventLandingCard } from '@/components/features/registration/EventLandingCard'
import type { Event } from '@/types/api'


interface LandingPageProps {
  params: Promise<{ eventSlug: string }>
}

async function fetchPublicEvent(slug: string): Promise<Event> {
  const res = await fetch(`/api/events/public/${slug}`)
  if (res.status === 404) throw new Error('NOT_FOUND')
  if (!res.ok) throw new Error('FETCH_ERROR')
  return res.json()
}

export default function EventLandingPage({ params }: LandingPageProps) {
  const { eventSlug } = use(params)

  const { data: event, isLoading, isError, error } = useQuery({
    queryKey: ['public-event', eventSlug],
    queryFn: () => fetchPublicEvent(eventSlug),
    retry: false,
  })

  if (isLoading) {
    return (
      <div className="max-w-md mx-auto px-4 py-8">
        <div className="rounded-2xl shadow-sm border border-border overflow-hidden">
          <div className="bg-muted animate-pulse h-40" />
          <div className="p-6 space-y-4">
            <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
            <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
            <div className="h-12 bg-muted rounded-xl animate-pulse mt-4" />
          </div>
        </div>
      </div>
    )
  }

  if (isError) {
    if ((error as Error).message === 'NOT_FOUND') {
      notFound()
    }
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center">
        <p className="text-muted-foreground">Gagal memuat informasi event. Silakan coba lagi.</p>
      </div>
    )
  }

  if (!event) return null

  return <EventLandingCard event={event} />
}
