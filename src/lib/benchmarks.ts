/**
 * Funnel conversion rate thresholds for the Event Pipeline Hub Overview tab.
 *
 * These benchmarks determine the ConversionBadge health color:
 *   good (green) / warn (amber) / bad (red) / pending (muted)
 */

export type Health = 'good' | 'warn' | 'bad' | 'pending'

export const FUNNEL_BENCHMARKS = {
  blastToRegistration:    { good: 0.20, warn: 0.10 },  // 20%+ good, 10-19% warn, <10% bad
  registrationToApproval: { good: 0.70, warn: 0.50 },  // 70%+ good, 50-69% warn, <50% bad
  approvalToAttendance:   { good: 0.90, warn: 0.75 },  // Event must be live/completed to evaluate
} as const

export type FunnelStage = keyof typeof FUNNEL_BENCHMARKS

export function getHealth(rate: number, stage: FunnelStage): Health {
  const bench = FUNNEL_BENCHMARKS[stage]
  if (rate >= bench.good) return 'good'
  if (rate >= bench.warn) return 'warn'
  return 'bad'
}
