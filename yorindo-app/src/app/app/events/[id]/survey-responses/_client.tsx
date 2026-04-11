'use client'

import React, { useState } from 'react'
import { useSurveyResponses } from '@/hooks/useSurveys'
import { SurveyResponseCharts } from '@/components/features/surveys/SurveyResponseCharts'
import { SurveyResponsesTable } from '@/components/features/surveys/SurveyResponsesTable'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, BarChart3, Download, List, Loader2, ClipboardCheck, MessageSquare } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

interface SurveyResponsesClientProps {
  id: string
}

export default function SurveyResponsesClient({ id }: SurveyResponsesClientProps) {
  const [surveyType, setSurveyType] = useState<'registration' | 'post-event'>('registration')
  const [view, setView] = useState<'charts' | 'table'>('charts')
  const [isExporting, setIsExporting] = useState(false)

  const { data, isLoading, isError } = useSurveyResponses(id, surveyType)

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const res = await fetch(`/api/events/${id}/surveys/responses/download?type=${surveyType}`)
      if (!res.ok) throw new Error('Export gagal')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `survey-responses-${surveyType}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('File berhasil diunduh!')
    } catch {
      toast.error('Gagal mengunduh file. Silakan coba lagi.')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Link
              href={`/app/events/${id}`}
              className="hover:text-primary transition-colors flex items-center gap-1 text-sm font-medium"
            >
              <ArrowLeft size={14} />
              Kembali ke Detail Event
            </Link>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            Dashboard Respons Survei
          </h1>
          <p className="text-slate-500 text-sm">
            Analisa jawaban peserta dari survei registrasi dan post-event.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            asChild
            className="border-slate-200"
          >
            <Link href={`/app/events/${id}/builder`}>
              <ClipboardCheck size={16} className="mr-2" />
              Buka Builder
            </Link>
          </Button>
          <Button
            size="sm"
            onClick={handleExport}
            disabled={isExporting}
            className="bg-violet-600 hover:bg-violet-700"
          >
            {isExporting ? (
              <Loader2 size={16} className="animate-spin mr-2" />
            ) : (
              <Download size={16} className="mr-2" />
            )}
            Export Respons
          </Button>
        </div>
      </div>

      {/* Controls row */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
        <div className="flex items-center gap-3">
          <Select
            value={surveyType}
            onValueChange={(v) => setSurveyType(v as 'registration' | 'post-event')}
          >
            <SelectTrigger className="w-[200px] h-9 border-violet-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="registration">
                <span className="flex items-center gap-2">
                  <ClipboardCheck size={14} /> Survei Registrasi
                </span>
              </SelectItem>
              <SelectItem value="post-event">
                <span className="flex items-center gap-2">
                  <MessageSquare size={14} /> Survei Post-Event
                </span>
              </SelectItem>
            </SelectContent>
          </Select>

          {!isLoading && data && (
            <Badge variant="outline" className="border-violet-200 text-violet-700">
              {data.total} respons
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-1 border rounded-lg p-1 bg-muted/30">
          <Button
            variant={view === 'charts' ? 'default' : 'ghost'}
            size="sm"
            className={`h-7 px-3 text-xs ${view === 'charts' ? 'bg-violet-600 hover:bg-violet-700 text-white' : ''}`}
            onClick={() => setView('charts')}
          >
            <BarChart3 size={14} className="mr-1" /> Grafik
          </Button>
          <Button
            variant={view === 'table' ? 'default' : 'ghost'}
            size="sm"
            className={`h-7 px-3 text-xs ${view === 'table' ? 'bg-violet-600 hover:bg-violet-700 text-white' : ''}`}
            onClick={() => setView('table')}
          >
            <List size={14} className="mr-1" /> Tabel
          </Button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-32 text-muted-foreground gap-3">
          <Loader2 className="animate-spin" size={32} />
          <p className="text-sm">Memuat data respons...</p>
        </div>
      ) : isError ? (
        <div className="text-center py-32 text-destructive">
          <p className="text-sm">Gagal memuat data. Silakan coba lagi.</p>
        </div>
      ) : data ? (
        view === 'charts' ? (
          <SurveyResponseCharts aggregates={data.aggregates} />
        ) : (
          <SurveyResponsesTable responses={data.responses} total={data.total} />
        )
      ) : null}
    </div>
  )
}
