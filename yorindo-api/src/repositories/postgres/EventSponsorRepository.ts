import type { Pool, QueryResultRow } from 'pg'
import type { IEventSponsorRepository } from '../../interfaces/repositories/IEventSponsorRepository.js'
import type { EventSponsor, EntityId } from '../../types/domain.js'
import { BasePostgresRepository } from './BasePostgresRepository.js'
import { createId } from '@paralleldrive/cuid2'

interface EventSponsorRow extends QueryResultRow {
  id: string
  event_id: string
  vendor_id: string
  tier: string
  display_order: number
  created_at: Date
}

export class PostgresEventSponsorRepository
  extends BasePostgresRepository
  implements IEventSponsorRepository
{
  constructor(pool: Pool) {
    super(pool)
  }

  private mapRow(row: EventSponsorRow): EventSponsor {
    return {
      id: row.id,
      eventId: row.event_id,
      vendorId: row.vendor_id,
      tier: row.tier as EventSponsor['tier'],
      displayOrder: row.display_order,
      createdAt: this.toIso(row.created_at),
    }
  }

  async findByEvent(eventId: EntityId): Promise<EventSponsor[]> {
    const { rows } = await this.query<EventSponsorRow>(
      'SELECT * FROM event_sponsors WHERE event_id = $1 ORDER BY display_order ASC',
      [eventId],
    )
    return rows.map((r) => this.mapRow(r))
  }

  async countByVendor(vendorId: EntityId): Promise<number> {
    const { rows } = await this.query<{ total: string }>(
      'SELECT COUNT(*) as total FROM event_sponsors WHERE vendor_id = $1',
      [vendorId],
    )
    return parseInt(rows[0]?.total ?? '0', 10)
  }

  async create(data: Omit<EventSponsor, 'id' | 'createdAt'>): Promise<EventSponsor> {
    const { rows } = await this.query<EventSponsorRow>(
      `INSERT INTO event_sponsors (id, event_id, vendor_id, tier, display_order)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [createId(), data.eventId, data.vendorId, data.tier, data.displayOrder],
    )
    return this.mapRow(rows[0]!)
  }

  async update(
    eventId: EntityId,
    vendorId: EntityId,
    data: Partial<EventSponsor>,
  ): Promise<EventSponsor | null> {
    const sets: string[] = []
    const values: unknown[] = []
    let idx = 1

    if ('tier' in data) { sets.push(`tier = $${idx++}`); values.push(data.tier) }
    if ('displayOrder' in data) { sets.push(`display_order = $${idx++}`); values.push(data.displayOrder) }

    if (sets.length === 0) {
      const { rows } = await this.query<EventSponsorRow>(
        'SELECT * FROM event_sponsors WHERE event_id = $1 AND vendor_id = $2',
        [eventId, vendorId],
      )
      return rows[0] ? this.mapRow(rows[0]) : null
    }

    values.push(eventId, vendorId)
    const { rows } = await this.query<EventSponsorRow>(
      `UPDATE event_sponsors SET ${sets.join(', ')} WHERE event_id = $${idx} AND vendor_id = $${idx + 1} RETURNING *`,
      values,
    )
    return rows[0] ? this.mapRow(rows[0]) : null
  }

  async delete(eventId: EntityId, vendorId: EntityId): Promise<boolean> {
    const { rowCount } = await this.query(
      'DELETE FROM event_sponsors WHERE event_id = $1 AND vendor_id = $2',
      [eventId, vendorId],
    )
    return (rowCount ?? 0) > 0
  }
}
