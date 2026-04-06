import type { SurveySchema, SurveyResponse, EntityId, SurveyType } from '../../types/domain.js'

export interface ISurveyRepository {
  // Dual-type schema access
  findByEventId(eventId: EntityId, type: SurveyType): Promise<SurveySchema | null>
  upsert(eventId: EntityId, type: SurveyType, schema: SurveySchema): Promise<SurveySchema>

  // Response management
  saveResponse(
    registrationId: EntityId,
    eventId: EntityId,
    type: SurveyType,
    answers: Record<string, unknown>
  ): Promise<void>
  getResponsesByEvent(
    eventId: EntityId,
    type: SurveyType,
    page?: number,
    pageSize?: number,
    search?: string
  ): Promise<{ responses: SurveyResponse[]; total: number }>
}
