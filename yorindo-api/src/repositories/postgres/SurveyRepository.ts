import type { Pool, QueryResultRow } from 'pg'
import type { ISurveyRepository } from '../../interfaces/repositories/ISurveyRepository.js'
import type { SurveySchema, SurveyResponse, SurveyType, EntityId } from '../../types/domain.js'
import { BasePostgresRepository } from './BasePostgresRepository.js'
import { createId } from '@paralleldrive/cuid2'

interface SurveyResponseRow extends QueryResultRow {
  id: string
  event_id: string
  registration_id: string
  survey_type: string
  responses: unknown
  submitted_at: Date
}

const SURVEY_COL: Record<SurveyType, string> = {
  'registration': 'registration_survey_schema',
  'post-event': 'post_event_survey_schema',
}

export class PostgresSurveyRepository
  extends BasePostgresRepository
  implements ISurveyRepository
{
  constructor(pool: Pool) {
    super(pool)
  }

  async findByEventId(eventId: EntityId, type: SurveyType): Promise<SurveySchema | null> {
    const col = SURVEY_COL[type]
    const { rows } = await this.query<{
      id: string
      schema_json: string | null
      created_at: Date
      updated_at: Date
    }>(
      `SELECT id, ${col} AS schema_json, created_at, updated_at FROM events WHERE id = $1`,
      [eventId],
    )
    const row = rows[0]
    if (!row?.schema_json) return null

    try {
      const parsed = JSON.parse(row.schema_json) as SurveySchema
      return {
        ...parsed,
        id: parsed.id ?? row.id,
        eventId,
        type,
        createdAt: this.toIso(row.created_at),
        updatedAt: this.toIso(row.updated_at),
      }
    } catch {
      return null
    }
  }

  async upsert(eventId: EntityId, type: SurveyType, schema: SurveySchema): Promise<SurveySchema> {
    const col = SURVEY_COL[type]
    await this.query(
      `UPDATE events SET ${col} = $2::jsonb, updated_at = NOW() WHERE id = $1`,
      [eventId, JSON.stringify(schema)],
    )
    return { ...schema, eventId, type }
  }

  async saveResponse(
    registrationId: EntityId,
    eventId: EntityId,
    type: SurveyType,
    answers: Record<string, unknown>,
  ): Promise<void> {
    await this.query(
      `INSERT INTO survey_responses (id, event_id, registration_id, survey_type, responses)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT DO NOTHING`,
      [createId(), eventId, registrationId, type, JSON.stringify(answers)],
    )
  }

  async getResponsesByEvent(
    eventId: EntityId,
    type: SurveyType,
    page = 1,
    pageSize = 20,
    search?: string,
  ): Promise<{ responses: SurveyResponse[]; total: number }> {
    const params: unknown[] = [eventId, type]
    let searchJoin = ''
    let searchWhere = ''

    if (search) {
      params.push(`%${search}%`)
      searchJoin = `JOIN contacts c ON c.id = r.contact_id`
      searchWhere = `AND (c.name ILIKE $${params.length} OR c.phone ILIKE $${params.length})`
    }

    const countResult = await this.query<{ count: string }>(
      `SELECT COUNT(*) AS count
       FROM survey_responses sr
       JOIN registrations r ON r.id = sr.registration_id
       ${searchJoin}
       WHERE sr.event_id = $1 AND sr.survey_type = $2 ${searchWhere}`,
      params,
    )
    const total = parseInt(countResult.rows[0]?.count ?? '0', 10)

    const offset = (page - 1) * pageSize
    params.push(pageSize, offset)

    const { rows } = await this.query<SurveyResponseRow>(
      `SELECT sr.id, sr.event_id, sr.registration_id, sr.survey_type, sr.responses, sr.submitted_at
       FROM survey_responses sr
       JOIN registrations r ON r.id = sr.registration_id
       ${searchJoin}
       WHERE sr.event_id = $1 AND sr.survey_type = $2 ${searchWhere}
       ORDER BY sr.submitted_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    )

    const responses: SurveyResponse[] = rows.map((r) => ({
      id: r.id,
      eventId: r.event_id,
      registrationId: r.registration_id,
      surveyType: r.survey_type as SurveyType,
      answers: r.responses as Record<string, unknown>,
      submittedAt: this.toIso(r.submitted_at),
    }))

    return { responses, total }
  }
}
