'use client'

import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

function buildBlastUrl(searchParams: URLSearchParams, total: number): string {
  const segmentParts: string[] = []
  const industry = searchParams.get('industry')
  const city = searchParams.get('city')
  const companySize = searchParams.get('companySize')
  if (industry) segmentParts.push(industry)
  if (city) segmentParts.push(city)
  if (companySize) segmentParts.push(companySize)

  const params = new URLSearchParams()
  if (segmentParts.length) params.set('segment', segmentParts.join(','))
  params.set('count', String(total))
  return `/app/blasts/new?${params.toString()}`
}

interface ActionToolbarProps {
  total: number
  searchParams: URLSearchParams
  isVisible: boolean
}

export function ActionToolbar({ total, searchParams, isVisible }: ActionToolbarProps) {
  const router = useRouter()

  if (!isVisible) return null

  const handleBlast = () => {
    router.push(buildBlastUrl(searchParams, total))
  }

  return (
    <Card
      role="toolbar"
      aria-label="Aksi segmen"
      className="sticky bottom-0 z-10 rounded-none border-t border-x-0 border-b-0 shadow-md"
    >
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-sm text-muted-foreground">
          {total} kontak di segmen ini
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => toast.info('Export CSV belum tersedia')}
          >
            Export CSV
          </Button>
          <Button size="sm" onClick={handleBlast}>
            Blast Segmen · {total} kontak →
          </Button>
        </div>
      </div>
    </Card>
  )
}
