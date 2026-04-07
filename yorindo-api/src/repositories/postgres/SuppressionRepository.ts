import type { Pool, QueryResultRow } from 'pg'
import type {
  ISuppressionRepository,
  SuppressionLookup,
  SuppressionCreateOptions,
} from '../../interfaces/repositories/ISuppressionRepository.js'
import type { PaginationParams } from '../../interfaces/repositories/IContactRepository.js'
import type { SuppressionRecord, EntityId } from '../../types/domain.js'
import { BasePostgresRepository } from './BasePostgresRepository.js'

interface ConsentRow extends QueryResultRow {
  id: string
  contact_id: string
  phone: string | null
  email: string | null
  name: string | null
  reason: string | null
  consent_status: string
  recorded_at: Date
}

export class PostgresSuppressionRepository
  extends BasePostgresRepository
  implements ISuppressionRepository
{
  constructor(pool: Pool) {
    super(pool)
  }

  private mapRow(row: ConsentRow): SuppressionRecord {
    return {
      id: row.id,
      contactId: row.contact_id,
      phone: row.phone,
      email: row.email,
      name: row.name,
      reason: row.reason ?? 'suppressed',
      createdAt: this.toIso(row.recorded_at),
    }
  }

  async isSuppressed(input: string | SuppressionLookup): Promise<boolean> {
    if (typeof input === 'string') {
      const { rows } = await this.query<{ exists: boolean }>(
        `SELECT EXISTS(
           SELECT 1 FROM consent_records WHERE phone = $1 OR email = $1
         ) as exists`,
        [input],
      )
      return rows[0]?.exists ?? false
    }

    const { rows } = await this.query<{ exists: boolean }>(
      `SELECT EXISTS(
         SELECT 1 FROM consent_records
         WHERE ($1::text IS NOT NULL AND phone = $1)
            OR ($2::text IS NOT NULL AND email = $2)
       ) as exists`,
      [input.phone ?? null, input.email ?? null],
    )
    return rows[0]?.exists ?? false
  }

  async suppress(
    contactId: EntityId,
    reason: string,
    options?: SuppressionCreateOptions,
  ): Promise<SuppressionRecord> {
    const { rows } = await this.query<ConsentRow>(
      `INSERT INTO consent_records (contact_id, consent_status, phone, email, name, reason, purpose)
       VALUES ($1, 'suppressed', $2, $3, $4, $5, $5) RETURNING *`,
      [contactId, options?.phone ?? null, options?.email ?? null, options?.name ?? null, reason],
    )
    await this.query(
      `UPDATE contacts SET consent_status = 'suppressed', updated_at = NOW() WHERE id = $1`,
      [contactId],
    )
    return this.mapRow(rows[0]!)
  }

  async remove(id: EntityId): Promise<boolean> {
    const { rowCount } = await this.query(
      'DELETE FROM consent_records WHERE id = $1',
      [id],
    )
    return (rowCount ?? 0) > 0
  }

  async findAll(
    params: PaginationParams,
  ): Promise<{ data: SuppressionRecord[]; total: number }> {
    const { page, pageSize } = params
    const offset = (page - 1) * pageSize

    const [countResult, dataResult] = await Promise.all([
      this.query<{ total: string }>(
        `SELECT COUNT(*) as total FROM consent_records WHERE consent_status = 'suppressed'`,
      ),
      this.query<ConsentRow>(
        `SELECT * FROM consent_records WHERE consent_status = 'suppressed'
         ORDER BY recorded_at DESC LIMIT $1 OFFSET $2`,
        [pageSize, offset],
      ),
    ])

    return {
      data: dataResult.rows.map((r) => this.mapRow(r)),
      total: parseInt(countResult.rows[0]?.total ?? '0', 10),
    }
  }
}
