'use client'

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface AudiencePreviewProps {
  eventId: string
}

interface Criteria {
  serviceType: string
  city: string
}

const INDUSTRIES = [
  '', 'teknologi', 'kesehatan', 'manufaktur', 'keuangan',
  'pendidikan', 'retail', 'properti', 'otomotif', 'energi', 'telekomunikasi',
]

const nativeSelectClass =
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors'

export function AudiencePreview({ eventId }: AudiencePreviewProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [criteria, setCriteria] = useState<Criteria>({ serviceType: '', city: '' })
  const [previewCount, setPreviewCount] = useState<number | null>(null)

  const previewMutation = useMutation({
    mutationFn: async (crit: Criteria) => {
      const body: Record<string, string> = {}
      if (crit.serviceType) body.serviceType = crit.serviceType
      if (crit.city) body.city = crit.city
      const res = await fetch(`/api/events/${eventId}/audience-preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      return res.json() as Promise<{ count: number }>
    },
    onSuccess: (data) => setPreviewCount(data.count),
  })

  const handlePreview = () => previewMutation.mutate(criteria)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Target Audience</h2>
          <Button variant="outline" size="sm" onClick={() => setIsExpanded((v) => !v)}>
            {isExpanded ? 'Tutup' : 'Atur Target'}
          </Button>
        </div>
      </CardHeader>
      {isExpanded && (
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Industri</label>
              <select
                value={criteria.serviceType}
                onChange={(e) => setCriteria((p) => ({ ...p, serviceType: e.target.value }))}
                className={nativeSelectClass}
              >
                <option value="">Semua Industri</option>
                {INDUSTRIES.filter(Boolean).map((i) => (
                  <option key={i} value={i}>{i.charAt(0).toUpperCase() + i.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Kota</label>
              <Input
                value={criteria.city}
                onChange={(e) => setCriteria((p) => ({ ...p, city: e.target.value }))}
                placeholder="Semua kota"
                className="h-9"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Button size="sm" onClick={handlePreview} disabled={previewMutation.isPending}>
              {previewMutation.isPending ? 'Menghitung…' : 'Preview Audience'}
            </Button>
            {previewCount !== null && (
              <div>
                <span className="text-lg font-bold">{previewCount.toLocaleString('id-ID')}</span>
                <span className="text-sm text-muted-foreground ml-1">kontak sesuai kriteria</span>
                {previewCount === 0 && (
                  <p className="text-xs text-destructive mt-1">
                    Tidak ada kontak yang sesuai — periksa filter sebelum publish
                  </p>
                )}
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  )
}
