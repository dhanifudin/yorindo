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

export interface InsightsResult {
  disabled?: boolean            // true when AI provider is disabled
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

export interface IInsightsService {
  analyze(snapshot: EventSnapshot): Promise<InsightsResult>
}
