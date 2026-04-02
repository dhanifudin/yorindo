import Link from 'next/link'
import { ConversionBadge } from './ConversionBadge'
import { getHealth, type Health } from '@/lib/benchmarks'
import { cn } from '@/lib/utils'

export interface FunnelData {
  blastCount: number
  registrationCount: number
  approvedCount: number
  attendedCount: number
  eventStatus: 'draft' | 'published' | 'active' | 'completed' | 'cancelled' | 'archived'
  eventId: string
}

interface FunnelBarProps {
  label: string
  count: number
  maxCount: number
  badge: React.ReactNode
  cta?: React.ReactNode
}

function FunnelBar({ label, count, maxCount, badge, cta }: FunnelBarProps) {
  const widthPct = Math.max((count / Math.max(maxCount, 1)) * 100, 2)

  return (
    <div className="flex items-center gap-3 py-2">
      <span className="w-24 text-sm text-right text-muted-foreground shrink-0">{label}</span>
      <div className="flex-1 bg-muted rounded-sm min-w-0">
        <div
          role="meter"
          aria-valuenow={count}
          aria-valuemax={maxCount}
          aria-label={`${label}: ${count.toLocaleString('id-ID')}`}
          style={{ width: `${widthPct}%` }}
          className={cn('h-8 rounded-sm transition-all duration-500', count === 0 ? 'bg-muted-foreground/20' : 'bg-primary')}
        />
      </div>
      <span className="w-16 text-sm font-medium text-right tabular-nums shrink-0">
        {count.toLocaleString('id-ID')}
      </span>
      <div className="shrink-0">{badge}</div>
      {cta && <div className="shrink-0">{cta}</div>}
    </div>
  )
}

export function FunnelVisualization({ blastCount, registrationCount, approvedCount, attendedCount, eventStatus, eventId }: FunnelData) {
  const maxCount = Math.max(blastCount, registrationCount, approvedCount, attendedCount, 1)
  const baseHref = `/app/events/${eventId}`

  // Conversion rates
  const blastToReg = blastCount > 0 ? registrationCount / blastCount : null
  const regToApproval = registrationCount > 0 ? approvedCount / registrationCount : null
  const approvalToAttend = approvedCount > 0 ? attendedCount / approvedCount : null

  const isLiveOrDone = eventStatus === 'active' || eventStatus === 'completed'

  const blastHealth: Health = blastCount === 0 ? 'pending' : blastToReg !== null ? getHealth(blastToReg, 'blastToRegistration') : 'pending'
  const regHealth: Health = registrationCount === 0 ? 'pending' : regToApproval !== null ? getHealth(regToApproval, 'registrationToApproval') : 'pending'
  const attendHealth: Health = !isLiveOrDone ? 'pending' : approvalToAttend !== null ? getHealth(approvalToAttend, 'approvalToAttendance') : 'pending'

  return (
    <div className="space-y-1">
      <FunnelBar
        label="Diundang"
        count={blastCount}
        maxCount={maxCount}
        badge={<ConversionBadge health="pending" rate={null} label="Blast baseline" />}
        cta={
          blastCount === 0 ? (
            <Link href={`${baseHref}/blast`} className="text-xs text-primary underline underline-offset-2 whitespace-nowrap">
              Kirim undangan
            </Link>
          ) : undefined
        }
      />
      <FunnelBar
        label="Mendaftar"
        count={registrationCount}
        maxCount={maxCount}
        badge={<ConversionBadge health={blastHealth} rate={blastToReg} label="Blast → Registrasi" />}
      />
      <FunnelBar
        label="Disetujui"
        count={approvedCount}
        maxCount={maxCount}
        badge={<ConversionBadge health={regHealth} rate={regToApproval} label="Registrasi → Disetujui" />}
      />
      <FunnelBar
        label="Hadir"
        count={attendedCount}
        maxCount={maxCount}
        badge={<ConversionBadge health={attendHealth} rate={isLiveOrDone ? approvalToAttend : null} label="Disetujui → Hadir" />}
      />
    </div>
  )
}

export function getWorstHealth(...healths: Health[]): Health | null {
  if (healths.includes('bad')) return 'bad'
  if (healths.includes('warn')) return 'warn'
  return null
}
