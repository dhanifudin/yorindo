'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Users } from 'lucide-react'

interface AudiencePreviewCardProps {
  count: number | undefined
  isLoading: boolean
}

export function AudiencePreviewCard({ count, isLoading }: AudiencePreviewCardProps) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-primary/10 p-2">
            <Users className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase font-medium">Audiens Target</p>
            {isLoading ? (
              <Skeleton className="h-6 w-24 mt-1" />
            ) : count === 0 ? (
              <p className="text-sm text-amber-700 font-medium">Tidak ada kontak cocok — periksa kriteria</p>
            ) : (
              <p className="text-sm font-medium">
                <span className="text-xl font-bold mr-1">{count?.toLocaleString('id-ID') ?? '—'}</span>
                kontak cocok dengan kriteria ini
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
