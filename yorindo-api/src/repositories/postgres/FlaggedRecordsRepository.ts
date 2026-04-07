import type { Pool, QueryResultRow } from 'pg'
import type { IFlaggedRecordsRepository } from '../../interfaces/repositories/IFlaggedRecordsRepository.js'
import type { PaginationParams } from '../../interfaces/repositories/IContactRepository.js'
import type { FlaggedRecord, FlaggedRecordStatus, Contact, EntityId } from '../../types/domain.js'
import { BasePostgresRepository } from './BasePostgresRepository.js'

interface FlaggedRow extends QueryResultRow {
  id: string
  raw_data: unknown
  flags: unknown
  status: string
  upload_id: string | null
  resolved_by: string | null
  resolved_at: Date | null
  created_at: Date
}

export class PostgresFlaggedRecordsRepository
  extends BasePostgresRepository
  implements IFlaggedRecordsRepository
{
  constructor(pool: Pool) {
    super(pool)
  }

  private mapRow(row: FlaggedRow): FlaggedRecord {
    return {
      id: row.id,
      rawData: row.raw_data as Record<string, unknown>,
      flags: (row.flags as string[]) ?? [],
      status: row.status as FlaggedRecordStatus,
      uploadId: row.upload_id,
      resolvedBy: row.resolved_by,
      resolvedAt: this.toIsoOrNull(row.resolved_at),
      createdAt: this.toIso(row.created_at),
    }
  }

  async findAll(
    params: PaginationParams,
    status?: FlaggedRecordStatus,
  ): Promise<{ data: FlaggedRecord[]; total: number }> {
    const { page, pageSize } = params
    const offset = (page - 1) * pageSize
    const conditions: string[] = []
    const values: unknown[] = []
    let idx = 1

    if (status) {
      conditions.push(`status = $${idx++}`)
      values.push(status)
    }

    const where = conditions.length ? conditions.join(' AND ') : 'TRUE'

    const [countResult, dataResult] = await Promise.all([
      this.query<{ total: string }>(`SELECT COUNT(*) as total FROM flagged_records WHERE ${where}`, values),
      this.query<FlaggedRow>(
        `SELECT * FROM flagged_records WHERE ${where} ORDER BY created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
        [...values, pageSize, offset],
      ),
    ])

    return {
      data: dataResult.rows.map((r) => this.mapRow(r)),
      total: parseInt(countResult.rows[0]?.total ?? '0', 10),
    }
  }

  async findById(id: EntityId): Promise<FlaggedRecord | null> {
    const { rows } = await this.query<FlaggedRow>(
      'SELECT * FROM flagged_records WHERE id = $1',
      [id],
    )
    return rows[0] ? this.mapRow(rows[0]) : null
  }

  async create(data: Omit<FlaggedRecord, 'id' | 'createdAt'>): Promise<FlaggedRecord> {
    const { createId } = await import('@paralleldrive/cuid2')
    const { rows } = await this.query<FlaggedRow>(
      `INSERT INTO flagged_records (id, raw_data, flags, status, upload_id, resolved_by, resolved_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [
        createId(),
        JSON.stringify(data.rawData),
        JSON.stringify(data.flags),
        data.status,
        data.uploadId,
        data.resolvedBy,
        data.resolvedAt,
      ],
    )
    return this.mapRow(rows[0]!)
  }

  async resolve(
    id: EntityId,
    resolvedData: Partial<Contact>,
    resolvedById: EntityId,
  ): Promise<void> {
    await this.withTransaction(async (client) => {
      await client.query(
        `UPDATE flagged_records SET status = 'resolved', resolved_by = $2, resolved_at = NOW() WHERE id = $1`,
        [id, resolvedById],
      )
    })
  }

  async discard(id: EntityId, resolvedById: EntityId): Promise<void> {
    await this.query(
      `UPDATE flagged_records SET status = 'discarded', resolved_by = $2, resolved_at = NOW() WHERE id = $1`,
      [id, resolvedById],
    )
  }
}
