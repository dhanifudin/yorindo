'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowRight } from 'lucide-react'

interface EventFunnelStatsProps {
  blastCount: number
  registered: number
  approved: number
  attended: number
  otsCount: number
  blastRegistered?: number
  organicRegistered?: number
}

interface FunnelStep {
  label: string
  value: number
  conversion?: string
}

export function EventFunnelStats({ blastCount, registered, approved, attended, otsCount, blastRegistered, organicRegistered }: EventFunnelStatsProps) {
  const totalAttended = attended + otsCount
  const noShow = approved - attended
  const noShowRate = approved > 0 ? Math.round((noShow / approved) * 100) : 0

  function pct(num: number, denom: number) {
    if (denom === 0) return null
    return `${Math.round((num / denom) * 100)}%`
  }

  const steps: FunnelStep[] = [
    { label: 'Diundang',   value: blastCount,    conversion: undefined },
    { label: 'Daftar',     value: registered,    conversion: pct(registered, blastCount) ?? '—' },
    { label: 'Disetujui',  value: approved,      conversion: pct(approved, registered) ?? '—' },
    { label: 'Hadir',      value: totalAttended, conversion: pct(totalAttended, approved) ?? '—' },
  ]

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Funnel Kehadiran</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Funnel steps */}
        <div className="flex items-center gap-1 flex-wrap">
          {steps.map((step, i) => (
            <div key={step.label} className="flex items-center gap-1">
              <div className="text-center min-w-[72px]">
                <p className="text-xl font-bold">{step.value.toLocaleString('id-ID')}</p>
                <p className="text-xs text-muted-foreground">{step.label}</p>
                {step.conversion && (
                  <p className="text-xs text-primary font-medium">{step.conversion}</p>
                )}
              </div>
              {i < steps.length - 1 && (
                <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              )}
            </div>
          ))}
        </div>

        {/* Attendance breakdown */}
        <div className="border-t pt-3 space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">🎟️ Pre-registered hadir</span>
            <span className="font-medium">{attended.toLocaleString('id-ID')}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">🚶 On The Spot (OTS)</span>
            <span className="font-medium">{otsCount.toLocaleString('id-ID')}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">❌ No-show</span>
            <span className="font-medium">{Math.max(0, noShow).toLocaleString('id-ID')}</span>
          </div>
          <div className="flex justify-between border-t pt-1.5">
            <span className="text-muted-foreground">Tingkat No-show</span>
            <span className={`font-semibold ${noShowRate > 30 ? 'text-destructive' : 'text-green-700'}`}>
              {noShowRate}%
            </span>
          </div>
        </div>

        {/* Registration source breakdown */}
        {(blastRegistered != null || organicRegistered != null) && (
          <div className="border-t pt-3 space-y-1.5 text-sm">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Sumber Registrasi</p>
            <div className="flex justify-between">
              <span className="text-muted-foreground">📧 Dari Undangan (Blast)</span>
              <span className="font-medium">{(blastRegistered ?? 0).toLocaleString('id-ID')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">🔗 Organik (Link Publik)</span>
              <span className="font-medium">{(organicRegistered ?? 0).toLocaleString('id-ID')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">🚶 On The Spot (OTS)</span>
              <span className="font-medium">{otsCount.toLocaleString('id-ID')}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
