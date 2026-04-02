'use client'

import React from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import type { SurveyResponseAggregate } from '@/types/surveys'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MessageSquare } from 'lucide-react'

interface SurveyResponseChartsProps {
  aggregates: SurveyResponseAggregate[]
}

const CHART_COLORS = [
  '#7c3aed', '#a855f7', '#c084fc', '#e879f9',
  '#f472b6', '#fb7185', '#f97316', '#facc15',
]

function BarQuestion({ agg }: { agg: SurveyResponseAggregate }) {
  const data = agg.optionCounts?.map((o) => ({
    name: o.label,
    count: o.count,
    percentage: o.percentage,
  })) ?? []

  return (
    <Card className="border-violet-100 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <Badge variant="outline" className="text-[10px] shrink-0 border-violet-200 text-violet-600 mt-0.5">
            {agg.fieldType === 'radio' ? 'Pilihan Ganda' : agg.fieldType === 'checkboxes' ? 'Kotak Centang' : agg.fieldType}
          </Badge>
          <CardTitle className="text-sm font-semibold leading-snug">{agg.questionLabel}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={data} layout="vertical" margin={{ left: 8, right: 32 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3e8ff" />
            <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
            <Tooltip
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: unknown) => [`${value ?? 0}%`, 'Persentase'] as any}
            />
            <Bar dataKey="percentage" radius={[0, 4, 4, 0]} maxBarSize={24}>
              {data.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

function PieQuestion({ agg }: { agg: SurveyResponseAggregate }) {
  const data = agg.optionCounts?.map((o) => ({ name: o.label, value: o.count })) ?? []

  return (
    <Card className="border-violet-100 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <Badge variant="outline" className="text-[10px] shrink-0 border-violet-200 text-violet-600 mt-0.5">
            Pie
          </Badge>
          <CardTitle className="text-sm font-semibold leading-snug">{agg.questionLabel}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={70}
              label={({ name, percent }: { name?: string; percent?: number }) =>
                `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`
              }
              labelLine={false}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Legend iconSize={10} iconType="circle" />
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

function TextQuestion({ agg }: { agg: SurveyResponseAggregate }) {
  return (
    <Card className="border-violet-100 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <Badge variant="outline" className="text-[10px] shrink-0 border-violet-200 text-violet-600 mt-0.5">
            Teks
          </Badge>
          <CardTitle className="text-sm font-semibold leading-snug">{agg.questionLabel}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground mb-3">
          {agg.totalCount ?? 0} respons diterima. Menampilkan sampel:
        </p>
        <div className="space-y-2">
          {agg.samples?.map((s, i) => (
            <div key={i} className="flex gap-2">
              <MessageSquare size={14} className="text-violet-400 shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground italic">&ldquo;{s}&rdquo;</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export function SurveyResponseCharts({ aggregates }: SurveyResponseChartsProps) {
  if (!aggregates.length) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p className="text-sm">Belum ada data agregat. Data akan muncul setelah respons masuk.</p>
      </div>
    )
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {aggregates.map((agg) => {
        if (agg.fieldType === 'textarea' || agg.fieldType === 'text') {
          return <TextQuestion key={agg.questionId} agg={agg} />
        }
        if (agg.fieldType === 'radio' || agg.fieldType === 'checkboxes') {
          // alternate between pie and bar for visual variety
          const isPie = aggregates.indexOf(agg) % 3 === 0
          return isPie
            ? <PieQuestion key={agg.questionId} agg={agg} />
            : <BarQuestion key={agg.questionId} agg={agg} />
        }
        return <BarQuestion key={agg.questionId} agg={agg} />
      })}
    </div>
  )
}
