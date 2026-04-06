import type { Pool, QueryResultRow } from 'pg'
import type {
  IRegistrationRepository,
  RegistrationFilters,
} from '../../interfaces/repositories/IRegistrationRepository.js'
import type { PaginationParams } from '../../interfaces/repositories/IContactRepository.js'
import type {
  Registration,
  RegistrationStatus,
  ConfirmationStats,
  BlastHistoryEntry,
  EntityId,
} from '../../types/domain.js'
import { BasePostgresRepository } from './BasePostgresRepository.js'

interface RegistrationRow extends QueryResultRow {
  id: string
  contact_id: string
  event_id: string
  status: string
  ticket_token: string | null
  ai_score: string | null
  flag_override: boolean
  approved_at: Date | null
  attended_at: Date | null
  upload_source: string | null
  event_date: string | null
  event_name_raw: string | null
  created_at: Date
}

export class PostgresRegistrationRepository
  extends BasePostgresRepository
  implements IRegistrationRepository
{
  constructor(pool: Pool) {
    super(pool)
  }

  private mapRow(row: RegistrationRow): Registration {
    return {
      id: row.id,
      contactId: row.contact_id,
      eventId: row.event_id,
      status: row.status as RegistrationStatus,
      ticketToken: row.ticket_token,
      aiScore: row.ai_score != null ? Number(row.ai_score) : null,
      flagOverride: row.flag_override ?? false,
      approvedAt: this.toIsoOrNull(row.approved_at),
      attendedAt: this.toIsoOrNull(row.attended_at),
      ...(row.upload_source ? { uploadSource: row.upload_source as NonNullable<Registration['uploadSource']> } : {}),
      ...(row.event_date ? { eventDate: row.event_date } : {}),
      ...(row.event_name_raw ? { eventNameRaw: row.event_name_raw } : {}),
      createdAt: this.toIso(row.created_at),
    } as Registration
  }

  private buildRegistrationWhere(filters?: RegistrationFilters): { conditions: string[]; values: unknown[] } {
    const conditions: string[] = []
    const values: unknown[] = []
    let idx = 1

    if (filters?.contactId) { conditions.push(`contact_id = $${idx++}`); values.push(filters.contactId) }
    if (filters?.eventId) { conditions.push(`event_id = $${idx++}`); values.push(filters.eventId) }
    if (filters?.status) { conditions.push(`status = $${idx++}`); values.push(filters.status) }
    if (filters?.aiScoreMin != null) { conditions.push(`ai_score >= $${idx++}`); values.push(filters.aiScoreMin) }
    if (filters?.aiScoreMax != null) { conditions.push(`ai_score <= $${idx++}`); values.push(filters.aiScoreMax) }
    if (filters?.flagged) { conditions.push('flag_override = TRUE') }

    return { conditions, values }
  }

  async findAll(
    params: PaginationParams,
    filters?: RegistrationFilters,
  ): Promise<{ data: Registration[]; total: number }> {
    const { page, pageSize } = params
    const offset = (page - 1) * pageSize
    const { conditions, values } = this.buildRegistrationWhere(filters)
    const where = conditions.length ? conditions.join(' AND ') : 'TRUE'

    const [countResult, dataResult] = await Promise.all([
      this.query<{ total: string }>(`SELECT COUNT(*) as total FROM registrations WHERE ${where}`, values),
      this.query<RegistrationRow>(
        `SELECT * FROM registrations WHERE ${where} ORDER BY created_at DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
        [...values, pageSize, offset],
      ),
    ])

    return {
      data: dataResult.rows.map((r) => this.mapRow(r)),
      total: parseInt(countResult.rows[0]?.total ?? '0', 10),
    }
  }

  async findByEvent(
    eventId: EntityId,
    params: PaginationParams,
    filters?: RegistrationFilters,
  ): Promise<{ data: Registration[]; total: number }> {
    return this.findAll(params, { ...filters, eventId })
  }

  async findById(id: EntityId): Promise<Registration | null> {
    const { rows } = await this.query<RegistrationRow>(
      'SELECT * FROM registrations WHERE id = $1',
      [id],
    )
    return rows[0] ? this.mapRow(rows[0]) : null
  }

  async findByTicketToken(ticketToken: string): Promise<Registration | null> {
    const { rows } = await this.query<RegistrationRow>(
      'SELECT * FROM registrations WHERE ticket_token = $1',
      [ticketToken],
    )
    return rows[0] ? this.mapRow(rows[0]) : null
  }

  async create(data: Omit<Registration, 'id' | 'createdAt'>): Promise<Registration> {
    const { rows } = await this.query<RegistrationRow>(
      `INSERT INTO registrations (
         contact_id, event_id, status, ticket_token, ai_score,
         flag_override, approved_at, attended_at,
         upload_source, event_date, event_name_raw
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [
        data.contactId,
        data.eventId,
        data.status,
        data.ticketToken,
        data.aiScore,
        data.flagOverride,
        data.approvedAt,
        data.attendedAt,
        data.uploadSource ?? null,
        data.eventDate ?? null,
        data.eventNameRaw ?? null,
      ],
    )
    return this.mapRow(rows[0]!)
  }

  async update(id: EntityId, data: Partial<Registration>): Promise<Registration | null> {
    const sets: string[] = []
    const values: unknown[] = []
    let idx = 1

    const fieldMap: Array<[keyof Registration, string]> = [
      ['status', 'status'],
      ['ticketToken', 'ticket_token'],
      ['aiScore', 'ai_score'],
      ['flagOverride', 'flag_override'],
      ['approvedAt', 'approved_at'],
      ['attendedAt', 'attended_at'],
      ['uploadSource', 'upload_source'],
    ]

    for (const [domainKey, dbCol] of fieldMap) {
      if (domainKey in data) {
        sets.push(`${dbCol} = $${idx}`)
        values.push(data[domainKey] ?? null)
        idx++
      }
    }

    if (sets.length === 0) return this.findById(id)
    values.push(id)

    const { rows } = await this.query<RegistrationRow>(
      `UPDATE registrations SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
      values,
    )
    return rows[0] ? this.mapRow(rows[0]) : null
  }

  async updateStatus(id: EntityId, status: RegistrationStatus): Promise<Registration | null> {
    const { rows } = await this.query<RegistrationRow>(
      `UPDATE registrations SET status = $2,
         approved_at = CASE WHEN $2 = 'approved' THEN NOW() ELSE approved_at END
       WHERE id = $1 RETURNING *`,
      [id, status],
    )
    return rows[0] ? this.mapRow(rows[0]) : null
  }

  async bulkApprove(ids: EntityId[]): Promise<{ approved: number }> {
    return this.withTransaction(async (client) => {
      const { rowCount } = await client.query(
        `UPDATE registrations SET status = 'approved', approved_at = NOW()
         WHERE id = ANY($1::text[]) AND status != 'approved'`,
        [ids],
      )
      return { approved: rowCount ?? 0 }
    })
  }

  async getConfirmationStats(eventId: EntityId): Promise<ConfirmationStats> {
    const { rows } = await this.query<{ status: string; total: string }>(
      `SELECT status, COUNT(*) as total FROM registrations WHERE event_id = $1 GROUP BY status`,
      [eventId],
    )
    const map = Object.fromEntries(rows.map((r) => [r.status, parseInt(r.total, 10)]))
    return {
      ticketsSent: (map['approved'] ?? 0) + (map['confirmed'] ?? 0),
      awaitingConfirmation: map['pending'] ?? 0,
      waitlisted: map['waitlisted'] ?? 0,
    }
  }

  async getBlastHistory(eventId: EntityId): Promise<BlastHistoryEntry[]> {
    const { rows } = await this.query<{
      id: string; channel: string; sent_at: Date; recipient_count: number; status: string
    }>(
      `SELECT id, channel, sent_at, recipient_count, status
       FROM blast_logs WHERE event_id = $1 ORDER BY sent_at DESC`,
      [eventId],
    )
    return rows.map((r) => ({
      id: r.id,
      channel: r.channel as BlastHistoryEntry['channel'],
      sentAt: this.toIso(r.sent_at),
      recipientCount: r.recipient_count,
      status: r.status as BlastHistoryEntry['status'],
    }))
  }
}
