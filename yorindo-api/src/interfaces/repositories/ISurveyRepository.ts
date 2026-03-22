import type { SurveySchema, SurveyResponse, UUID } from '../../types/domain.js'

export interface ISurveyRepository {
  findByEventId(eventId: UUID): Promise<SurveySchema | null>
  upsert(eventId: UUID, schema: SurveySchema): Promise<SurveySchema>
  saveResponse(registrationId: UUID, answers: Record<string, unknown>): Promise<void>
  getResponsesByEvent(eventId: UUID): Promise<SurveyResponse[]>
}
