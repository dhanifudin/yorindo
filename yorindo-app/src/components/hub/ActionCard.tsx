import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { Health } from '@/lib/benchmarks'

interface ActionCardProps {
  baseHref: string
  blastHealth: Health
  regHealth: Health
  blastCount: number
  eventStatus: string
}

export function ActionCard({ baseHref, blastHealth, regHealth, blastCount, eventStatus }: ActionCardProps) {
  const isDraft = eventStatus === 'draft'

  // Priority: no blast > bad registration conversion > bad approval conversion
  if (blastCount === 0) {
    return (
      <Card className={isDraft ? 'border-muted bg-muted/20' : 'border-red-200 bg-red-50'}>
        <CardContent className="pt-4">
          {isDraft ? (
            <>
              <p className="text-sm font-medium text-muted-foreground mb-2">Event belum dipublikasikan</p>
              <p className="text-xs text-muted-foreground mb-3">Blast undangan hanya dapat dilakukan setelah event dipublikasikan.</p>
              <Button size="sm" variant="outline" disabled>
                Kirim Undangan
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-red-700 mb-2">Belum ada blast</p>
              <p className="text-xs text-red-600 mb-3">Undangan belum dikirim ke kontak manapun.</p>
              <Button size="sm" asChild>
                <Link href={`${baseHref}/blast`}>Kirim Undangan Sekarang</Link>
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    )
  }

  if (blastHealth === 'bad') {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-4">
          <p className="text-sm font-medium text-red-700 mb-2">Konversi blast rendah</p>
          <p className="text-xs text-red-600 mb-3">Kurang dari 10% yang diundang mendaftar.</p>
          <Button size="sm" asChild>
            <Link href={`${baseHref}/blast`}>Kirim Follow-up Blast</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (regHealth === 'bad') {
    return (
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="pt-4">
          <p className="text-sm font-medium text-amber-700 mb-2">Persetujuan tertunda</p>
          <p className="text-xs text-amber-600 mb-3">Kurang dari 50% pendaftar telah disetujui.</p>
          <Button size="sm" asChild>
            <Link href={`${baseHref}/registrations`}>Review Pendaftaran</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return null
}
