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
  const att = attended ?? 0
  const reg = registered ?? 0
  const app = approved ?? 0
  const ots = otsCount ?? 0
  const bl = blastRegistered ?? 0
  const org = organicRegistered ?? 0
  const totalAttended = att + ots
  const noShow = app - att
  const noShowRate = app > 0 ? Math.round((noShow / app) * 100) : 0

  function pct(num: number, denom: number) {
    if (denom === 0) return null
    return `${Math.round((num / denom) * 100)}%`
  }

  const steps: FunnelStep[] = [
    { label: 'Diundang',   value: blastCount ?? 0,    conversion: undefined },
    { label: 'Daftar',     value: reg,                conversion: pct(reg, blastCount ?? 0) ?? '—' },
    { label: 'Disetujui',  value: app,                conversion: pct(app, reg) ?? '—' },
    { label: 'Hadir',      value: totalAttended,      conversion: pct(totalAttended, app) ?? '—' },
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
            <span className="font-medium">{att.toLocaleString('id-ID')}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">🚶 On The Spot (OTS)</span>
            <span className="font-medium">{ots.toLocaleString('id-ID')}</span>
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
              <span className="font-medium">{bl.toLocaleString('id-ID')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">🔗 Organik (Link Publik)</span>
              <span className="font-medium">{org.toLocaleString('id-ID')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">🚶 On The Spot (OTS)</span>
              <span className="font-medium">{ots.toLocaleString('id-ID')}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
