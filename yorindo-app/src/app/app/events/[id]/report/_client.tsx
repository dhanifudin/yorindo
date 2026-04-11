'use client'

import { use, useState } from 'react'
import { useReport } from '@/hooks/useReport'
import { MetricCards, MetricCardsSkeleton } from '@/components/features/reports/MetricCards'
import { AttendanceFunnelChart } from '@/components/features/reports/AttendanceFunnelChart'
import { DemographicsCharts } from '@/components/features/reports/DemographicsCharts'
import { AnalyticsDashboard } from '@/components/features/events/AnalyticsDashboard'
import { InsightsPanel } from '@/components/features/events/InsightsPanel'
import { Button } from '@/components/ui/button'

interface ReportPageProps {
  params: Promise<{ id: string }>
}

export default function ReportPage({ params }: ReportPageProps) {
  const { id } = use(params)
  const { data: report, isLoading } = useReport(id)
  const [downloadMsg, setDownloadMsg] = useState<string | null>(null)

  const handleDownload = (format: 'Excel' | 'PDF') => {
    setDownloadMsg(`Download ${format} dimulai... Fitur tersedia setelah integrasi backend.`)
    setTimeout(() => setDownloadMsg(null), 3000)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Laporan Kehadiran</h1>
        {/* TODO: Re-enable download buttons when backend integration is ready
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleDownload('Excel')}>
            Download Excel
          </Button>
          <Button onClick={() => handleDownload('PDF')}>
            Download PDF
          </Button>
        </div>
        */}
      </div>

      {downloadMsg && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 rounded-lg px-4 py-3 text-sm">
          {downloadMsg}
        </div>
      )}

      {isLoading ? (
        <>
          <MetricCardsSkeleton />
          <div className="bg-muted rounded-lg h-64 animate-pulse" />
          <div className="grid grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-muted rounded-lg h-56 animate-pulse" />
            ))}
          </div>
        </>
      ) : report ? (
        <>
          <MetricCards
            totalInvited={report.totalInvited}
            registered={report.registered}
            approved={report.approved}
            attended={report.attended}
            otsCount={report.otsCount ?? 0}
            attendanceRate={report.attendanceRate}
            noShowRate={report.noShowRate}
          />
          <AttendanceFunnelChart
            totalInvited={report.totalInvited}
            registered={report.registered}
            approved={report.approved}
            attended={report.attended}
          />
          <DemographicsCharts
            industryBreakdown={report.industryBreakdown}
            cityBreakdown={report.cityBreakdown}
            jobTitleBreakdown={report.jobTitleBreakdown}
          />
          <AnalyticsDashboard eventId={id} />
          <InsightsPanel eventId={id} />
        </>
      ) : (
        <p className="text-muted-foreground">Laporan tidak tersedia.</p>
      )}
    </div>
  )
}
