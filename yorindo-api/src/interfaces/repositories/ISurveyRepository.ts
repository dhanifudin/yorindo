import type { SurveySchema, SurveyResponse, EntityId } from '../../types/domain.js'

export interface ISurveyRepository {
  findByEventId(eventId: EntityId): Promise<SurveySchema | null>
  upsert(eventId: EntityId, schema: SurveySchema): Promise<SurveySchema>
  saveResponse(registrationId: EntityId, answers: Record<string, unknown>): Promise<void>
  getResponsesByEvent(eventId: EntityId): Promise<SurveyResponse[]>
}
