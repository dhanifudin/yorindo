'use client'

import {
  PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis,
} from 'recharts'

const PIE_COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#8b5cf6', '#f43f5e', '#06b6d4']

interface DemographicsChartsProps {
  industryBreakdown: Array<{ industry: string; count: number }>
  cityBreakdown: Array<{ city: string; count: number }>
  jobTitleBreakdown: Array<{ level: string; count: number }>
}

export function DemographicsCharts({ industryBreakdown, cityBreakdown, jobTitleBreakdown }: DemographicsChartsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Industri</h3>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie data={industryBreakdown} dataKey="count" nameKey="industry" cx="50%" cy="50%" outerRadius={70}>
              {industryBreakdown.map((_, i) => (
                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Kota</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={cityBreakdown} layout="vertical">
            <XAxis type="number" tick={{ fontSize: 10 }} />
            <YAxis type="category" dataKey="city" tick={{ fontSize: 10 }} width={60} />
            <Tooltip />
            <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Jabatan</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={jobTitleBreakdown}>
            <XAxis dataKey="level" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip />
            <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
