import type { Event, PublicEventSponsor } from '@/types/api'
import Link from 'next/link'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { SponsorStrip } from '@/components/features/registration/SponsorStrip'

interface EventLandingCardProps {
  event: Event & { sponsors?: PublicEventSponsor[] }
}

export function EventLandingCard({ event }: EventLandingCardProps) {
  const sponsors = event.sponsors ?? []
  const formattedDate = new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: event.timezone,
  }).format(new Date(event.eventDate))

  const isFull = event.capacity != null && event.capacity <= 0

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <Card className="overflow-hidden shadow-sm">
        <CardHeader className="bg-primary px-6 py-8 text-primary-foreground rounded-none">
          <p className="text-primary-foreground/70 text-sm font-medium uppercase tracking-wide mb-2">Event</p>
          <h1 className="text-2xl font-bold leading-tight">{event.name}</h1>
        </CardHeader>

        <CardContent className="px-6 py-6 space-y-4">
          <div>
            <p className="text-xs text-muted-foreground uppercase font-medium mb-1">Tanggal & Waktu</p>
            <p className="font-medium">{formattedDate}</p>
          </div>

          {event.description && (
            <div>
              <p className="text-xs text-muted-foreground uppercase font-medium mb-1">Deskripsi</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{event.description}</p>
            </div>
          )}

          {event.capacity != null && (
            <div>
              <p className="text-xs text-muted-foreground uppercase font-medium mb-1">Kapasitas</p>
              <p className="font-medium">{event.capacity} peserta</p>
            </div>
          )}
        </CardContent>

        <CardContent className="px-6 pb-6 pt-0">
          {isFull ? (
            <Button disabled variant="outline" className="w-full py-4 text-base">
              Kapasitas Penuh
            </Button>
          ) : (
            <Button asChild size="lg" className="w-full text-base">
              <Link href={`/register/${event.slug}/form`}>Daftar Sekarang</Link>
            </Button>
          )}
        </CardContent>

        {sponsors.length > 0 && (
          <SponsorStrip sponsors={sponsors} />
        )}
      </Card>
    </div>
  )
}
