import type { Metadata } from 'next'
import ClientPage from './_client'

export const dynamic = 'force-static'

// Static OG data for known event slugs (Phase 1 — MSW fixtures)
const EVENT_OG: Record<string, { title: string; description: string; banner?: string }> = {
  'seminar-erp-jakarta': {
    title: 'Seminar ERP Jakarta',
    description: 'Seminar tentang implementasi ERP di industri manufaktur dan distribusi.',
    banner: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&h=675&fit=crop',
  },
  'workshop-ai-untuk-bisnis': {
    title: 'Workshop AI untuk Bisnis',
    description: 'Workshop praktis penggunaan AI dalam operasional bisnis.',
    banner: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=1200&h=675&fit=crop',
  },
  'forum-kesehatan-digital-surabaya': {
    title: 'Forum Kesehatan Digital Surabaya',
    description: 'Forum diskusi transformasi digital di sektor kesehatan.',
    banner: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1200&h=675&fit=crop',
  },
  'konferensi-manufaktur-2025': {
    title: 'Konferensi Manufaktur 2025',
    description: 'Konferensi tahunan industri manufaktur Indonesia.',
  },
  'summit-properti-bali': {
    title: 'Summit Properti Bali',
    description: 'Summit investasi properti dan real estate di Bali.',
  },
}

const DEFAULT_OG_IMAGE = '/images/og-default.png'

export function generateStaticParams() {
  return Object.keys(EVENT_OG).map((eventSlug) => ({ eventSlug }))
}

export function generateMetadata({ params }: { params: { eventSlug: string } }): Metadata {
  const event = EVENT_OG[params.eventSlug]
  if (!event) {
    return { title: 'Event — EM · U' }
  }

  const ogImage = event.banner ?? DEFAULT_OG_IMAGE
  const description = event.description.length > 200
    ? event.description.slice(0, 197) + '...'
    : event.description

  return {
    title: `${event.title} — EM · U`,
    description,
    openGraph: {
      title: event.title,
      description,
      images: [{ url: ogImage, width: 1200, height: 675 }],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: event.title,
      description,
      images: [ogImage],
    },
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function Page(props: any) {
  return <ClientPage {...props} />
}
