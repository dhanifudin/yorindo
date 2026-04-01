import type { PublicEventSponsor } from '@/types/api'

interface SponsorStripProps {
  sponsors: PublicEventSponsor[]
}

export function SponsorStrip({ sponsors }: SponsorStripProps) {
  if (sponsors.length === 0) return null

  return (
    <div className="px-6 pb-6 pt-0">
      <p className="text-xs text-muted-foreground uppercase font-medium mb-3 text-center">
        Didukung oleh
      </p>
      <div className="flex flex-wrap items-center justify-center gap-4">
        {sponsors.map((sponsor) => {
          const content = sponsor.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={sponsor.logo_url}
              alt={sponsor.name}
              className="h-10 object-contain"
            />
          ) : (
            <span className="text-sm font-medium text-muted-foreground">{sponsor.name}</span>
          )

          if (sponsor.website) {
            return (
              <a
                key={sponsor.vendor_id}
                href={sponsor.website}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:opacity-75 transition-opacity"
                aria-label={sponsor.name}
              >
                {content}
              </a>
            )
          }

          return (
            <div key={sponsor.vendor_id} aria-label={sponsor.name}>
              {content}
            </div>
          )
        })}
      </div>
    </div>
  )
}
