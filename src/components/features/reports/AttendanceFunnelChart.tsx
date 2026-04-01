'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

interface AttendanceFunnelChartProps {
  totalInvited: number
  registered: number
  approved: number
  attended: number
}

const COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#8b5cf6']

export function AttendanceFunnelChart({ totalInvited, registered, approved, attended }: AttendanceFunnelChartProps) {
  const data = [
    { name: 'Diundang', count: totalInvited },
    { name: 'Registrasi', count: registered },
    { name: 'Disetujui', count: approved },
    { name: 'Hadir', count: attended },
  ]

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Funnel Kehadiran</h3>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} layout="vertical" margin={{ left: 16 }}>
          <XAxis type="number" tick={{ fontSize: 11 }} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
          <Tooltip formatter={(value) => [(value as number).toLocaleString('id-ID'), 'Peserta']} />
          <Bar dataKey="count" radius={[0, 4, 4, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
