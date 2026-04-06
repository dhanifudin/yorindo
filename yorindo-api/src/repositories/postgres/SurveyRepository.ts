import type { Pool, QueryResultRow } from 'pg'
import type { ISurveyRepository } from '../../interfaces/repositories/ISurveyRepository.js'
import type { SurveySchema, SurveyResponse, EntityId } from '../../types/domain.js'
import { BasePostgresRepository } from './BasePostgresRepository.js'
import { createId } from '@paralleldrive/cuid2'

interface SurveyResponseRow extends QueryResultRow {
  id: string
  event_id: string
  registration_id: string
  responses: unknown
  submitted_at: Date
}

export class PostgresSurveyRepository
  extends BasePostgresRepository
  implements ISurveyRepository
{
  constructor(pool: Pool) {
    super(pool)
  }

  async findByEventId(eventId: EntityId): Promise<SurveySchema | null> {
    const { rows } = await this.query<{
      id: string
      registration_survey_schema: string | null
      created_at: Date
      updated_at: Date
    }>(
      'SELECT id, registration_survey_schema, created_at, updated_at FROM events WHERE id = $1',
      [eventId],
    )
    const row = rows[0]
    if (!row?.registration_survey_schema) return null

    try {
      const parsed = JSON.parse(row.registration_survey_schema) as SurveySchema
      return {
        ...parsed,
        id: parsed.id ?? row.id,
        eventId,
        createdAt: this.toIso(row.created_at),
        updatedAt: this.toIso(row.updated_at),
      }
    } catch {
      return null
    }
  }

  async upsert(eventId: EntityId, schema: SurveySchema): Promise<SurveySchema> {
    await this.query(
      `UPDATE events SET registration_survey_schema = $2::jsonb, updated_at = NOW() WHERE id = $1`,
      [eventId, JSON.stringify(schema)],
    )
    return { ...schema, eventId }
  }

  async saveResponse(
    registrationId: EntityId,
    answers: Record<string, unknown>,
  ): Promise<void> {
    const { rows } = await this.query<{ event_id: string }>(
      'SELECT event_id FROM registrations WHERE id = $1',
      [registrationId],
    )
    const eventId = rows[0]?.event_id
    if (!eventId) return

    await this.query(
      `INSERT INTO survey_responses (id, event_id, registration_id, survey_type, responses)
       VALUES ($1, $2, $3, 'registration', $4)
       ON CONFLICT DO NOTHING`,
      [createId(), eventId, registrationId, JSON.stringify(answers)],
    )
  }

  async getResponsesByEvent(eventId: EntityId): Promise<SurveyResponse[]> {
    const { rows } = await this.query<SurveyResponseRow>(
      `SELECT sr.id, sr.event_id, sr.registration_id, sr.responses, sr.submitted_at
       FROM survey_responses sr
       WHERE sr.event_id = $1
       ORDER BY sr.submitted_at DESC`,
      [eventId],
    )
    return rows.map((r) => ({
      id: r.id,
      eventId: r.event_id,
      registrationId: r.registration_id,
      answers: r.responses as Record<string, unknown>,
      submittedAt: this.toIso(r.submitted_at),
    }))
  }
}
