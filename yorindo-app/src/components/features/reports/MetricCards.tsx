interface MetricCardsProps {
  totalInvited: number
  registered: number
  approved: number
  attended: number
  otsCount: number
  attendanceRate: string
  noShowRate: string
}

interface MetricCardProps {
  label: string
  value: number | string
  colorClass: string
}

function MetricCard({ label, value, colorClass }: MetricCardProps) {
  return (
    <div className={`bg-white border-l-4 ${colorClass} rounded-lg p-4 shadow-sm`}>
      <p className="text-xs text-gray-500 uppercase font-medium mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  )
}

export function MetricCards({ totalInvited, registered, approved, attended, otsCount, attendanceRate, noShowRate }: MetricCardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
      <MetricCard label="Diundang" value={totalInvited} colorClass="border-blue-500" />
      <MetricCard label="Registrasi" value={registered} colorClass="border-yellow-500" />
      <MetricCard label="Disetujui" value={approved} colorClass="border-green-500" />
      <MetricCard label="Hadir" value={attended} colorClass="border-purple-500" />
      <MetricCard label="On The Spot" value={otsCount} colorClass="border-orange-500" />
      <MetricCard label="Tingkat Kehadiran" value={`${attendanceRate}%`} colorClass="border-teal-500" />
      <MetricCard label="No-Show" value={`${noShowRate}%`} colorClass="border-red-400" />
    </div>
  )
}

export function MetricCardsSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="bg-gray-200 rounded-lg h-20 animate-pulse" />
      ))}
    </div>
  )
}
