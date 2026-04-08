export interface EventSnapshot {
  eventId: string
  eventName: string
  eventDate: string
  capacity: number | null
  registrationCount: number
  approvedCount: number
  attendedCount: number
  conversionRate: number
  registrations: Array<{
    id: string
    contactName: string
    status: string
    aiScore: number | null
  }>
}

export interface YoriMindResult {
  disabled?: boolean            // true when AI provider is disabled (AC5)
  summary: string               // Indonesian language summary
  analysis: string              // Deep-dive analysis paragraph
  root_causes: string[]         // Root cause bullet points
  recommendations: Array<{      // Prioritized recommendations
    action: string
    priority: 'high' | 'medium' | 'low'
    impact: string
  }>
  tracked_metrics: string[]     // Metrics to monitor going forward
  generatedAt: string           // ISO date string
}

export interface IYoriMindService {
  /**
   * Analyze an event snapshot and return AI-generated insights in Indonesian.
   * Phase 1: MockYoriMindService returns hardcoded analysis.
   * Phase 2: Real adapter calls the configured AI provider.
   */
  analyze(snapshot: EventSnapshot): Promise<YoriMindResult>
}
