'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface EventHealthScoreCardProps {
  attended: number
  approved: number
  registered: number
  blastCount: number
  otsCount: number
  surveyScore: number | null
}

function scoreColor(score: number) {
  if (score >= 75) return 'bg-green-100 text-green-800'
  if (score >= 50) return 'bg-yellow-100 text-yellow-800'
  return 'bg-red-100 text-red-800'
}

function scoreLabel(score: number) {
  if (score >= 75) return 'Sukses'
  if (score >= 50) return 'Cukup Baik'
  return 'Perlu Ditingkatkan'
}

export function EventHealthScoreCard({
  attended, approved, registered, blastCount, otsCount, surveyScore,
}: EventHealthScoreCardProps) {
  const totalAttended = attended + otsCount
  const attendanceRate = approved > 0 ? Math.round((totalAttended / approved) * 100) : 0
  const noShowRate = approved > 0 ? Math.round(((approved - attended) / approved) * 100) : 0
  const noShowScore = 100 - noShowRate
  const blastConversionRaw = blastCount > 0 ? Math.min((registered / blastCount) * 100, 100) : null
  const blastConversion = blastConversionRaw !== null ? Math.round(blastConversionRaw) : null

  const hasSurvey = surveyScore !== null
  const hasBlast = blastConversion !== null

  // Effective weights depending on available data
  let wAttendance: number, wNoShow: number, wBlast: number, wSurvey: number
  if (hasSurvey && hasBlast) {
    wAttendance = 0.4; wNoShow = 0.2; wBlast = 0.2; wSurvey = 0.2
  } else if (hasSurvey && !hasBlast) {
    wAttendance = 0.5; wNoShow = 0.25; wBlast = 0; wSurvey = 0.25
  } else if (!hasSurvey && hasBlast) {
    wAttendance = 0.5; wNoShow = 0.25; wBlast = 0.25; wSurvey = 0
  } else {
    wAttendance = 0.67; wNoShow = 0.33; wBlast = 0; wSurvey = 0
  }

  const contAttendance = Math.round(attendanceRate * wAttendance)
  const contNoShow = Math.round(noShowScore * wNoShow)
  const contBlast = hasBlast ? Math.round(blastConversion! * wBlast) : null
  const contSurvey = hasSurvey ? Math.round(surveyScore! * wSurvey) : null

  const score = contAttendance + contNoShow + (contBlast ?? 0) + (contSurvey ?? 0)

  const scoreFormula = [contAttendance, contNoShow, contBlast, contSurvey]
    .filter((c) => c !== null)
    .join(' + ') + ` = ${score} poin`

  const indicators = [
    {
      label: 'Tingkat Kehadiran',
      value: `${attendanceRate}%`,
      detail: `${totalAttended} hadir dari ${approved} disetujui`,
      contribution: `${attendanceRate}% × ${Math.round(wAttendance * 100)}% = ${contAttendance} poin`,
      weight: `${Math.round(wAttendance * 100)}%`,
      good: attendanceRate >= 70,
    },
    {
      label: 'Tingkat No-show',
      value: `${noShowRate}%`,
      detail: `${Math.max(0, approved - attended)} tidak hadir dari ${approved} disetujui`,
      contribution: `(100% − ${noShowRate}%) × ${Math.round(wNoShow * 100)}% = ${contNoShow} poin`,
      weight: `${Math.round(wNoShow * 100)}%`,
      good: noShowRate <= 30,
    },
    {
      label: 'Konversi Blast',
      value: blastConversion !== null ? `${blastConversion}%` : '—',
      detail: blastConversion !== null ? `${registered} daftar dari ${blastCount} diundang` : 'Tidak ada data blast',
      contribution: hasBlast
        ? `${blastConversion}% × ${Math.round(wBlast * 100)}% = ${contBlast} poin`
        : 'Bobot didistribusikan ke indikator lain',
      weight: hasBlast ? `${Math.round(wBlast * 100)}%` : '(terdistribusi)',
      good: blastConversion === null || blastConversion >= 20,
    },
    {
      label: 'Skor Survei',
      value: surveyScore !== null ? `${Math.round(surveyScore)}/100` : '—',
      detail: surveyScore !== null ? 'Rata-rata nilai range dari survei post-event' : 'Tidak ada survei post-event',
      contribution: hasSurvey
        ? `${Math.round(surveyScore!)}% × ${Math.round(wSurvey * 100)}% = ${contSurvey} poin`
        : 'Bobot didistribusikan ke indikator lain',
      weight: hasSurvey ? `${Math.round(wSurvey * 100)}%` : '(terdistribusi)',
      good: surveyScore === null || surveyScore >= 60,
    },
  ]

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Event Health Score</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <div className={`flex items-center justify-center w-20 h-20 rounded-full text-2xl font-bold shrink-0 ${scoreColor(score)}`}>
            {score}%
          </div>
          <div>
            <p className="text-lg font-semibold">{scoreLabel(score)}</p>
            <p className="text-xs text-muted-foreground">Skor komposit performa event</p>
            <p className="text-xs text-muted-foreground/60 mt-0.5 font-mono">{scoreFormula}</p>
          </div>
        </div>
        <div className="space-y-3">
          {indicators.map((ind) => (
            <div key={ind.label} className="flex items-start justify-between text-sm gap-4">
              <span className="flex flex-col gap-0.5 min-w-0">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <span>{ind.good ? '✅' : '⚠️'}</span>
                  <span>{ind.label}</span>
                  <Badge variant="outline" className="text-xs px-1 py-0">{ind.weight}</Badge>
                </span>
                <span className="text-xs text-muted-foreground/60 pl-6">{ind.detail}</span>
                <span className="text-xs text-muted-foreground/50 pl-6 font-mono">{ind.contribution}</span>
              </span>
              <span className="font-medium shrink-0">{ind.value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
