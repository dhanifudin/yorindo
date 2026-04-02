'use client'

import { use } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface VendorReportPageProps {
  params: Promise<{ token: string }>
}

interface VendorReport {
  token: string
  eventName: string
  dpaVersion: string
  dpaAccepted: boolean
  report: {
    totalInvited: number
    registered: number
    approved: number
    attended: number
    attendanceRate: string
    industryBreakdown: Array<{ industry: string; count: number }>
    cityBreakdown: Array<{ city: string; count: number }>
  } | null
}

export default function VendorReportPage({ params }: VendorReportPageProps) {
  const { token } = use(params)
  const queryClient = useQueryClient()

  const { data, isLoading, isError, error } = useQuery<VendorReport>({
    queryKey: ['vendor-report', token],
    queryFn: async () => {
      const res = await fetch(`/api/vendor-report/${token}`)
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body?.error?.message ?? 'Akses ditolak')
      }
      return res.json()
    },
    retry: false,
  })

  const acceptDpaMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/vendor-report/${token}/dpa`, { method: 'POST' })
      if (!res.ok) throw new Error('Gagal menerima DPA')
      return res.json()
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vendor-report', token] }),
  })

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="h-64 bg-muted rounded-xl animate-pulse" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="max-w-md mx-auto px-4 py-12 text-center">
        <Card>
          <CardContent className="pt-8 pb-8 space-y-3">
            <div className="text-4xl">🔒</div>
            <h2 className="text-xl font-bold">Akses Ditolak</h2>
            <p className="text-muted-foreground text-sm">
              {(error as Error).message}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!data) return null

  // DPA gate
  if (!data.dpaAccepted) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12">
        <Card>
          <CardHeader>
            <h1 className="text-xl font-bold">Laporan Event: {data.eventName}</h1>
            <p className="text-sm text-muted-foreground">Diperlukan persetujuan DPA untuk mengakses laporan</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-muted/50 p-4 text-sm space-y-2">
              <p className="font-medium">Perjanjian Pemrosesan Data (DPA) — {data.dpaVersion}</p>
              <p className="text-muted-foreground">
                Dengan mengakses laporan ini, Anda menyetujui bahwa data peserta akan digunakan sesuai
                dengan ketentuan kontrak antara klien dan Yorindo, dan sesuai dengan UU PDP Indonesia.
                Data tidak boleh dibagikan kepada pihak ketiga tanpa persetujuan tertulis.
              </p>
            </div>
            <Button
              className="w-full"
              onClick={() => acceptDpaMutation.mutate()}
              disabled={acceptDpaMutation.isPending}
            >
              {acceptDpaMutation.isPending ? 'Menyimpan…' : 'Saya Menyetujui DPA — Akses Laporan'}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const report = data.report!

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div>
        <Badge className="bg-green-100 text-green-700 mb-2">DPA Disetujui</Badge>
        <h1 className="text-2xl font-bold">{data.eventName}</h1>
        <p className="text-muted-foreground text-sm">Laporan Pasca-Event</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Diundang', value: report.totalInvited },
          { label: 'Mendaftar', value: report.registered },
          { label: 'Disetujui', value: report.approved },
          { label: 'Hadir', value: report.attended },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="pt-4">
          <p className="text-sm text-muted-foreground mb-1">Tingkat Kehadiran</p>
          <p className="text-3xl font-bold">{report.attendanceRate}%</p>
        </CardContent>
      </Card>

      {/* Industry breakdown */}
      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold">Breakdown Industri</h2>
        </CardHeader>
        <CardContent className="space-y-2">
          {report.industryBreakdown.map((item) => (
            <div key={item.industry} className="flex items-center gap-3">
              <span className="text-sm w-28 capitalize">{item.industry}</span>
              <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-primary"
                  style={{ width: `${(item.count / report.attended) * 100}%` }}
                />
              </div>
              <span className="text-sm text-muted-foreground w-6 text-right">{item.count}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
