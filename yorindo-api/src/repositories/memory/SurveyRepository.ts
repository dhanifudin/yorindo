import type { ISurveyRepository } from '../../interfaces/repositories/ISurveyRepository.js'
import type { SurveySchema, SurveyResponse } from '../../types/domain.js'

export class InMemorySurveyRepository implements ISurveyRepository {
  private schemas: Map<string, SurveySchema> = new Map()  // eventId → SurveySchema
  private responses: Map<string, SurveyResponse[]> = new Map() // eventId → responses

  async findByEventId(eventId: string): Promise<SurveySchema | null> {
    return this.schemas.get(eventId) ?? null
  }

  async upsert(eventId: string, schema: SurveySchema): Promise<SurveySchema> {
    const updated: SurveySchema = { ...schema, eventId, updatedAt: new Date().toISOString() }
    this.schemas.set(eventId, updated)
    return updated
  }

  async saveResponse(registrationId: string, answers: Record<string, unknown>): Promise<void> {
    // Find which event this registration belongs to — in-memory we store by eventId
    // For simplicity, use 'default' key; real impl queries by registrationId
    const response: SurveyResponse = {
      id: crypto.randomUUID(),
      eventId: 'unknown',
      registrationId,
      answers,
      submittedAt: new Date().toISOString(),
    }
    const existing = this.responses.get('default') ?? []
    this.responses.set('default', [...existing, response])
  }

  async getResponsesByEvent(eventId: string): Promise<SurveyResponse[]> {
    return this.responses.get(eventId) ?? []
  }
}
