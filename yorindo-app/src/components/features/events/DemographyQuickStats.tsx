'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import type { CompletionStats } from '@/types/api'

type DemographyQuickStatsProps = CompletionStats['demography']

function DemographyCard({
  title,
  items,
}: {
  title: string
  items: { name: string; count: number }[]
}) {
  const max = items[0]?.count ?? 1
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground">Tidak ada data</p>
        ) : (
          items.map((item) => (
            <div key={item.name} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="truncate max-w-[160px]" title={item.name}>{item.name}</span>
                <span className="font-medium ml-2 flex-shrink-0">{item.count}</span>
              </div>
              <Progress value={Math.round((item.count / max) * 100)} className="h-1.5" />
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}

export function DemographyQuickStats({ cities, industries, jobTitles }: DemographyQuickStatsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <DemographyCard title="Top Kota" items={cities} />
      <DemographyCard title="Top Industri" items={industries} />
      <DemographyCard title="Top Jabatan" items={jobTitles} />
    </div>
  )
}
