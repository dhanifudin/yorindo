import type { Pool, QueryResultRow } from 'pg'
import type { IVendorRepository } from '../../interfaces/repositories/IVendorRepository.js'
import type { Vendor, EntityId } from '../../types/domain.js'
import { BasePostgresRepository } from './BasePostgresRepository.js'

interface VendorRow extends QueryResultRow {
  id: string
  name: string
  contact_email: string | null
  industry: string | null
  logo_url: string | null
  website: string | null
  notes: string | null
  created_at: Date
  updated_at: Date | null
}

export class PostgresVendorRepository
  extends BasePostgresRepository
  implements IVendorRepository
{
  constructor(pool: Pool) {
    super(pool)
  }

  private mapRow(row: VendorRow): Vendor {
    return {
      id: row.id,
      name: row.name,
      contactEmail: row.contact_email ?? '',
      industry: row.industry ?? '',
      logoUrl: row.logo_url,
      website: row.website,
      notes: row.notes,
      createdAt: this.toIso(row.created_at),
      updatedAt: row.updated_at ? this.toIso(row.updated_at) : this.toIso(row.created_at),
    }
  }

  async findAll(page: number, pageSize: number): Promise<{ data: Vendor[]; total: number }> {
    const offset = (page - 1) * pageSize

    const [countResult, dataResult] = await Promise.all([
      this.query<{ total: string }>('SELECT COUNT(*) as total FROM vendors'),
      this.query<VendorRow>(
        'SELECT * FROM vendors ORDER BY created_at DESC LIMIT $1 OFFSET $2',
        [pageSize, offset],
      ),
    ])

    return {
      data: dataResult.rows.map((r) => this.mapRow(r)),
      total: parseInt(countResult.rows[0]?.total ?? '0', 10),
    }
  }

  async findById(id: EntityId): Promise<Vendor | null> {
    const { rows } = await this.query<VendorRow>('SELECT * FROM vendors WHERE id = $1', [id])
    return rows[0] ? this.mapRow(rows[0]) : null
  }

  async create(data: Omit<Vendor, 'id' | 'createdAt' | 'updatedAt'>): Promise<Vendor> {
    const { rows } = await this.query<VendorRow>(
      `INSERT INTO vendors (name, contact_email, industry, logo_url, website, notes)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [data.name, data.contactEmail, data.industry, data.logoUrl, data.website, data.notes],
    )
    return this.mapRow(rows[0]!)
  }

  async update(id: EntityId, data: Partial<Vendor>): Promise<Vendor | null> {
    const sets: string[] = []
    const values: unknown[] = []
    let idx = 1

    if ('name' in data) { sets.push(`name = $${idx++}`); values.push(data.name) }
    if ('contactEmail' in data) { sets.push(`contact_email = $${idx++}`); values.push(data.contactEmail) }
    if ('industry' in data) { sets.push(`industry = $${idx++}`); values.push(data.industry) }
    if ('logoUrl' in data) { sets.push(`logo_url = $${idx++}`); values.push(data.logoUrl) }
    if ('website' in data) { sets.push(`website = $${idx++}`); values.push(data.website) }
    if ('notes' in data) { sets.push(`notes = $${idx++}`); values.push(data.notes) }

    if (sets.length === 0) return this.findById(id)
    sets.push(`updated_at = NOW()`)
    values.push(id)

    const { rows } = await this.query<VendorRow>(
      `UPDATE vendors SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
      values,
    )
    return rows[0] ? this.mapRow(rows[0]) : null
  }

  async delete(id: EntityId): Promise<boolean> {
    const { rowCount } = await this.query('DELETE FROM vendors WHERE id = $1', [id])
    return (rowCount ?? 0) > 0
  }
}
