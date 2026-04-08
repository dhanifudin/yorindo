import type { IYoriMindService, EventSnapshot, YoriMindResult } from '../../../interfaces/services/IYoriMindService.js'

/**
 * Disabled YoriMind Service (AC5 — Graceful Degradation)
 *
 * Returned when YORIMIND_AI_PROVIDER=disabled.
 * Signals to the frontend that AI insights are intentionally turned off.
 */
export class DisabledYoriMindService implements IYoriMindService {
  async analyze(_snapshot: EventSnapshot): Promise<YoriMindResult> {
    return {
      disabled: true,
      summary: '',
      insights: [],
      recommendations: [],
      generatedAt: new Date().toISOString(),
    }
  }
}
