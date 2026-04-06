import type { Event, PublicEventSponsor } from '@/types/api'
import Link from 'next/link'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { SponsorStrip } from '@/components/features/registration/SponsorStrip'
import Image from 'next/image'

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
        <div className="relative aspect-video w-full bg-primary overflow-hidden">
          {event.bannerUrl ? (
            <Image
              src={event.bannerUrl}
              alt={event.name}
              fill
              unoptimized
              className="object-cover"
              priority
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/10 via-muted to-primary/5 flex items-center justify-center">
              <span className="text-primary-foreground/50 font-medium">Brosur Event</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex flex-col justify-end p-6">
            <p className="text-white/70 text-xs font-semibold uppercase tracking-widest mb-1">Event Mendatang</p>
            <h1 className="text-2xl font-bold text-white leading-tight drop-shadow-sm">{event.name}</h1>
          </div>
        </div>


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
