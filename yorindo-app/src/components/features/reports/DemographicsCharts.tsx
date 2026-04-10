'use client'

import {
  BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts'

const BAR_COLORS = [
  '#3b82f6', '#f59e0b', '#10b981', '#8b5cf6', '#f43f5e', '#06b6d4',
  '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16', '#ef4444',
]

interface DemographicsChartsProps {
  industryBreakdown: Array<{ industry: string; count: number }>
  cityBreakdown: Array<{ city: string; count: number }>
  jobTitleBreakdown: Array<{ level: string; count: number }>
}

// ─── Custom Tooltip ──────────────────────────────────────────────────────────

function BarTooltip({ active, payload, prefix }: { active?: boolean; payload?: Array<{ payload: Record<string, unknown>; fill: string; value: number }>; prefix?: string }) {
  if (!active || !payload?.[0]) return null
  const label = payload[0].payload[prefix ?? 'industry'] ?? payload[0].payload.city ?? payload[0].payload.level
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-sm">
      <p className="font-semibold text-gray-900">{String(label)}</p>
      <p className="text-gray-500">{payload[0].value} peserta</p>
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function DemographicsCharts({ industryBreakdown, cityBreakdown, jobTitleBreakdown }: DemographicsChartsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* ── Industry Bar Chart ── */}
      <div className="bg-white border rounded-xl p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-700 mb-1">Industri Peserta</h3>
        <p className="text-xs text-muted-foreground mb-3">Distribusi berdasarkan bidang industri</p>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={industryBreakdown} layout="vertical" margin={{ left: 0, right: 12 }}>
            <XAxis type="number" tick={{ fontSize: 10 }} />
            <YAxis type="category" dataKey="industry" tick={{ fontSize: 10 }} width={80} />
            <Tooltip content={<BarTooltip prefix="industry" />} />
            <Bar
              dataKey="count"
              fill="#3b82f6"
              radius={[0, 4, 4, 0]}
            >
              {industryBreakdown.map((_, i) => (
                <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── City Bar Chart ── */}
      <div className="bg-white border rounded-xl p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-700 mb-1">Kota Asal</h3>
        <p className="text-xs text-muted-foreground mb-3">Top kota peserta terdaftar</p>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={cityBreakdown} layout="vertical" margin={{ left: 0, right: 12 }}>
            <XAxis type="number" tick={{ fontSize: 10 }} />
            <YAxis type="category" dataKey="city" tick={{ fontSize: 10 }} width={70} />
            <Tooltip content={<BarTooltip prefix="city" />} />
            <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── Job Title Bar Chart ── */}
      <div className="bg-white border rounded-xl p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-700 mb-1">Jabatan</h3>
        <p className="text-xs text-muted-foreground mb-3">Distribusi level jabatan</p>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={jobTitleBreakdown} margin={{ bottom: 4 }}>
            <XAxis dataKey="level" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip content={<BarTooltip prefix="level" />} />
            <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
