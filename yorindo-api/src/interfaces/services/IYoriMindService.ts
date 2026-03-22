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
  summary: string               // Indonesian language summary
  insights: string[]            // bullet-point insights
  recommendations: string[]     // actionable recommendations
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
