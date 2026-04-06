import type { Pool, QueryResultRow } from 'pg'
import type { IRawUploadRepository } from '../../interfaces/repositories/IRawUploadRepository.js'
import type { RawUpload } from '../../types/domain.js'
import { BasePostgresRepository } from './BasePostgresRepository.js'
import { createId } from '@paralleldrive/cuid2'

interface RawUploadRow extends QueryResultRow {
  id: string
  filename: string
  uploaded_by: string | null
  row_count: number
  upserted_count: number
  flagged_count: number
  failed_count: number
  status: string
  created_at: Date
}

export class PostgresRawUploadRepository
  extends BasePostgresRepository
  implements IRawUploadRepository
{
  constructor(pool: Pool) {
    super(pool)
  }

  private mapRow(row: RawUploadRow): RawUpload {
    return {
      id: row.id,
      filename: row.filename,
      uploadedBy: row.uploaded_by,
      rowCount: row.row_count,
      upsertedCount: row.upserted_count,
      flaggedCount: row.flagged_count,
      failedCount: row.failed_count,
      status: row.status as RawUpload['status'],
      createdAt: this.toIso(row.created_at),
    }
  }

  async create(data: Omit<RawUpload, 'id' | 'createdAt'>): Promise<RawUpload> {
    const { rows } = await this.query<RawUploadRow>(
      `INSERT INTO raw_uploads (id, filename, uploaded_by, row_count, upserted_count, flagged_count, failed_count, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [
        createId(),
        data.filename,
        data.uploadedBy,
        data.rowCount,
        data.upsertedCount,
        data.flaggedCount,
        data.failedCount,
        data.status,
      ],
    )
    return this.mapRow(rows[0]!)
  }

  async findById(id: string): Promise<RawUpload | null> {
    const { rows } = await this.query<RawUploadRow>(
      'SELECT * FROM raw_uploads WHERE id = $1',
      [id],
    )
    return rows[0] ? this.mapRow(rows[0]) : null
  }

  async update(id: string, data: Partial<RawUpload>): Promise<RawUpload | null> {
    const sets: string[] = []
    const values: unknown[] = []
    let idx = 1

    if ('rowCount' in data) { sets.push(`row_count = $${idx++}`); values.push(data.rowCount) }
    if ('upsertedCount' in data) { sets.push(`upserted_count = $${idx++}`); values.push(data.upsertedCount) }
    if ('flaggedCount' in data) { sets.push(`flagged_count = $${idx++}`); values.push(data.flaggedCount) }
    if ('failedCount' in data) { sets.push(`failed_count = $${idx++}`); values.push(data.failedCount) }
    if ('status' in data) { sets.push(`status = $${idx++}`); values.push(data.status) }

    if (sets.length === 0) return this.findById(id)
    values.push(id)

    const { rows } = await this.query<RawUploadRow>(
      `UPDATE raw_uploads SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
      values,
    )
    return rows[0] ? this.mapRow(rows[0]) : null
  }
}
