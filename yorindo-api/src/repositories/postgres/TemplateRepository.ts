import type { Pool, QueryResultRow } from 'pg'
import type { ITemplateRepository } from '../../interfaces/repositories/ITemplateRepository.js'
import type { Template, EntityId } from '../../types/domain.js'
import { BasePostgresRepository } from './BasePostgresRepository.js'

interface TemplateRow extends QueryResultRow {
  id: string
  name: string
  type: string
  channel: string
  subject: string | null
  body: string
  logo_url: string | null
  image_type: string | null
  bg_opacity: number | null
  created_at: Date
  updated_at: Date
}

export class PostgresTemplateRepository
  extends BasePostgresRepository
  implements ITemplateRepository
{
  constructor(pool: Pool) {
    super(pool)
  }

  private mapRow(row: TemplateRow): Template {
    const template: Template = {
      id: row.id,
      name: row.name,
      type: row.type as Template['type'],
      channel: row.channel as Template['channel'],
      body: row.body,
      createdAt: this.toIso(row.created_at),
      updatedAt: this.toIso(row.updated_at),
    }
    if (row.subject != null) template.subject = row.subject
    if (row.logo_url != null) template.logoUrl = row.logo_url
    if (row.image_type != null) template.imageType = row.image_type as Template['imageType']
    if (row.bg_opacity != null) template.bgOpacity = Number(row.bg_opacity)
    return template
  }

  async create(data: Omit<Template, 'id' | 'createdAt' | 'updatedAt'>): Promise<Template> {
    const { rows } = await this.query<TemplateRow>(
      `INSERT INTO templates (id, name, type, channel, subject, body, logo_url, image_type, bg_opacity)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        crypto.randomUUID(),
        data.name,
        data.type,
        data.channel,
        data.subject ?? null,
        data.body,
        data.logoUrl ?? null,
        data.imageType ?? null,
        data.bgOpacity ?? null,
      ],
    )
    return this.mapRow(rows[0]!)
  }

  async findById(id: EntityId): Promise<Template | null> {
    const { rows } = await this.query<TemplateRow>(
      'SELECT * FROM templates WHERE id = $1',
      [id],
    )
    return rows[0] ? this.mapRow(rows[0]) : null
  }

  async findAll(): Promise<Template[]> {
    const { rows } = await this.query<TemplateRow>(
      'SELECT * FROM templates ORDER BY created_at DESC',
    )
    return rows.map((r) => this.mapRow(r))
  }

  async update(id: EntityId, updates: Partial<Template>): Promise<Template | null> {
    const sets: string[] = []
    const values: unknown[] = []
    let idx = 1

    if ('name' in updates) { sets.push(`name = $${idx++}`); values.push(updates.name) }
    if ('type' in updates) { sets.push(`type = $${idx++}`); values.push(updates.type) }
    if ('channel' in updates) { sets.push(`channel = $${idx++}`); values.push(updates.channel) }
    if ('subject' in updates) { sets.push(`subject = $${idx++}`); values.push(updates.subject ?? null) }
    if ('body' in updates) { sets.push(`body = $${idx++}`); values.push(updates.body) }
    if ('logoUrl' in updates) { sets.push(`logo_url = $${idx++}`); values.push(updates.logoUrl ?? null) }
    if ('imageType' in updates) { sets.push(`image_type = $${idx++}`); values.push(updates.imageType ?? null) }
    if ('bgOpacity' in updates) { sets.push(`bg_opacity = $${idx++}`); values.push(updates.bgOpacity ?? null) }

    if (sets.length === 0) return this.findById(id)
    sets.push(`updated_at = NOW()`)
    values.push(id)

    const { rows } = await this.query<TemplateRow>(
      `UPDATE templates SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
      values,
    )
    return rows[0] ? this.mapRow(rows[0]) : null
  }

  async delete(id: EntityId): Promise<boolean> {
    const { rowCount } = await this.query(
      'DELETE FROM templates WHERE id = $1',
      [id],
    )
    return (rowCount ?? 0) > 0
  }
}
