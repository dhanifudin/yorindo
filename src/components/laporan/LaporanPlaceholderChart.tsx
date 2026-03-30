import { Skeleton } from '@/components/ui/skeleton'

export function LaporanPlaceholderChart() {
  return (
    <div className="space-y-3 p-4">
      {/* Non-pulsing skeleton bars — intentional placeholder, not loading */}
      <div className="flex items-end gap-2 h-32">
        {[80, 60, 45, 30].map((h, i) => (
          <div
            key={i}
            className="animate-none flex-1 rounded bg-muted"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
      <div className="flex gap-2">
        {['Blast', 'Mendaftar', 'Disetujui', 'Hadir'].map((label) => (
          <span key={label} className="flex-1 text-center text-xs text-muted-foreground">
            {label}
          </span>
        ))}
      </div>
    </div>
  )
}
