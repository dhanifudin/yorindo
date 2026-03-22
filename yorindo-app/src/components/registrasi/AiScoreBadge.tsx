import { cn } from '@/lib/utils'

type AiStatus = 'complete' | 'in-progress' | 'failed'

interface AiScoreBadgeProps {
  score: number  // 0–99
  status?: AiStatus
  className?: string
}

function getScoreConfig(score: number) {
  if (score >= 80) return { symbol: '✓', className: 'text-green-700 bg-green-50', label: 'Tinggi' }
  if (score >= 50) return { symbol: '~', className: 'text-amber-700 bg-amber-50', label: 'Sedang' }
  return { symbol: '✗', className: 'text-red-700 bg-red-50', label: 'Rendah' }
}

export function AiScoreBadge({ score, status = 'complete', className }: AiScoreBadgeProps) {
  if (status === 'in-progress') {
    return (
      <span
        aria-label="Menilai"
        className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium text-gray-400 bg-gray-50', className)}
      >
        … Menilai
      </span>
    )
  }

  if (status === 'failed') {
    return (
      <span
        aria-label="Gagal dinilai"
        className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium text-gray-500 bg-gray-100', className)}
      >
        ⚠ Gagal
      </span>
    )
  }

  const { symbol, className: colorClass, label } = getScoreConfig(score)
  return (
    <span
      aria-label={`Skor AI: ${score} — ${label}`}
      className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium', colorClass, className)}
    >
      {symbol} {score}
    </span>
  )
}
