import type { Pool, QueryResultRow } from 'pg'
import type { IEventRepository, EventFilters } from '../../interfaces/repositories/IEventRepository.js'
import type { PaginationParams } from '../../interfaces/repositories/IContactRepository.js'
import type { Event, EventOverviewMetrics, UpcomingUncontactedResult, EntityId } from '../../types/domain.js'
import { BasePostgresRepository } from './BasePostgresRepository.js'

interface EventRow extends QueryResultRow {
  id: string
  name: string
  slug: string
  date: Date
  start_time: string | null
  end_date: Date | null
  end_time: string | null
  timezone: string
  city: string | null
  venue: string | null
  description: string | null
  capacity: number | null
  waitlist_buffer: number
  approval_mode: string
  notification_channel: string
  scan_format: string
  target_criteria: unknown
  registration_survey_schema: string | null
  vendor_id: string | null
  status: string
  is_paid: boolean
  price: string | null
  payment_method: string | null
  deleted_at: Date | null
  created_at: Date
  updated_at: Date
}

export class PostgresEventRepository
  extends BasePostgresRepository
  implements IEventRepository
{
  constructor(pool: Pool) {
    super(pool)
  }

  private mapRow(row: EventRow): Event {
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      startDate: this.toIso(row.date),
      startTime: row.start_time ?? '09:00',
      endDate: row.end_date ? this.toIso(row.end_date) : this.toIso(row.date),
      endTime: row.end_time ?? '17:00',
      timezone: row.timezone ?? 'Asia/Jakarta',
      city: row.city,
      venue: row.venue,
      description: row.description,
      capacity: row.capacity,
      waitlistBuffer: row.waitlist_buffer ?? 0,
      approvalMode: row.approval_mode as Event['approvalMode'],
      notificationChannel: row.notification_channel as Event['notificationChannel'],
      scanFormat: 'qr',
      targetCriteria: row.target_criteria ? (row.target_criteria as Event['targetCriteria']) : null,
      surveySchemaId: row.registration_survey_schema,
      vendorId: row.vendor_id,
      status: row.status as Event['status'],
      isPaid: row.is_paid ?? false,
      price: row.price != null ? Number(row.price) : null,
      paymentMethod: row.payment_method,
      deletedAt: this.toIsoOrNull(row.deleted_at),
      createdAt: this.toIso(row.created_at),
      updatedAt: this.toIso(row.updated_at),
    }
  }

  private buildEventWhere(filters?: EventFilters): { conditions: string[]; values: unknown[] } {
    const conditions: string[] = []
    const values: unknown[] = []
    let idx = 1

    if (!filters?.deleted || filters.deleted === 'exclude') {
      conditions.push('deleted_at IS NULL')
    } else if (filters.deleted === 'only') {
      conditions.push('deleted_at IS NOT NULL')
    }

    if (filters?.ids?.length) {
      conditions.push(`id = ANY($${idx}::text[])`)
      values.push(filters.ids)
      idx++
    }
    if (filters?.status) {
      conditions.push(`status = $${idx}`)
      values.push(filters.status)
      idx++
    }
    if (filters?.city) {
      conditions.push(`city ILIKE $${idx}`)
      values.push(`%${filters.city}%`)
      idx++
    }
    if (filters?.search) {
      conditions.push(`(name ILIKE $${idx} OR slug ILIKE $${idx})`)
      values.push(`%${filters.search}%`)
      idx++
    }

    return { conditions, values }
  }

  async findAll(
    params: PaginationParams,
    filters?: EventFilters,
  ): Promise<{ data: Event[]; total: number }> {
    const { page, pageSize, sortBy = 'created_at', sortDir = 'desc' } = params
    const offset = (page - 1) * pageSize
    const { conditions, values } = this.buildEventWhere(filters)
    const where = conditions.length ? conditions.join(' AND ') : 'TRUE'
    const safeSort = ['created_at', 'name', 'date', 'status'].includes(sortBy) ? sortBy : 'created_at'
    const safeDir = sortDir === 'asc' ? 'ASC' : 'DESC'

    const [countResult, dataResult] = await Promise.all([
      this.query<{ total: string }>(`SELECT COUNT(*) as total FROM events WHERE ${where}`, values),
      this.query<EventRow>(
        `SELECT * FROM events WHERE ${where} ORDER BY ${safeSort} ${safeDir} LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
        [...values, pageSize, offset],
      ),
    ])

    return {
      data: dataResult.rows.map((r) => this.mapRow(r)),
      total: parseInt(countResult.rows[0]?.total ?? '0', 10),
    }
  }

  async findById(id: EntityId): Promise<Event | null> {
    const { rows } = await this.query<EventRow>('SELECT * FROM events WHERE id = $1', [id])
    return rows[0] ? this.mapRow(rows[0]) : null
  }

  async findBySlug(slug: string): Promise<Event | null> {
    const { rows } = await this.query<EventRow>(
      `SELECT * FROM events WHERE slug = $1 AND deleted_at IS NULL AND status IN ('published', 'active')`,
      [slug],
    )
    return rows[0] ? this.mapRow(rows[0]) : null
  }

  async create(data: Omit<Event, 'id' | 'createdAt' | 'updatedAt'>): Promise<Event> {
    const { rows } = await this.query<EventRow>(
      `INSERT INTO events (
         name, slug, date, start_time, end_date, end_time, timezone,
         city, venue, description, capacity, waitlist_buffer,
         approval_mode, notification_channel, scan_format,
         target_criteria, registration_survey_schema, vendor_id, status,
         is_paid, price, payment_method, deleted_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)
       RETURNING *`,
      [
        data.name,
        data.slug,
        data.startDate,
        data.startTime,
        data.endDate,
        data.endTime,
        data.timezone,
        data.city,
        data.venue,
        data.description,
        data.capacity,
        data.waitlistBuffer,
        data.approvalMode,
        data.notificationChannel,
        data.scanFormat,
        data.targetCriteria ? JSON.stringify(data.targetCriteria) : null,
        data.surveySchemaId,
        data.vendorId,
        data.status,
        data.isPaid,
        data.price,
        data.paymentMethod,
        data.deletedAt,
      ],
    )
    return this.mapRow(rows[0]!)
  }

  async update(id: EntityId, data: Partial<Event>): Promise<Event | null> {
    const sets: string[] = []
    const values: unknown[] = []
    let idx = 1

    const fieldMap: Array<[keyof Event, string, boolean?]> = [
      ['name', 'name'],
      ['slug', 'slug'],
      ['startDate', 'date'],
      ['startTime', 'start_time'],
      ['endDate', 'end_date'],
      ['endTime', 'end_time'],
      ['timezone', 'timezone'],
      ['city', 'city'],
      ['venue', 'venue'],
      ['description', 'description'],
      ['capacity', 'capacity'],
      ['waitlistBuffer', 'waitlist_buffer'],
      ['approvalMode', 'approval_mode'],
      ['notificationChannel', 'notification_channel'],
      ['surveySchemaId', 'registration_survey_schema'],
      ['vendorId', 'vendor_id'],
      ['status', 'status'],
      ['isPaid', 'is_paid'],
      ['price', 'price'],
      ['paymentMethod', 'payment_method'],
      ['deletedAt', 'deleted_at'],
      ['targetCriteria', 'target_criteria', true],
    ]

    for (const [domainKey, dbCol, isJson] of fieldMap) {
      if (domainKey in data) {
        sets.push(`${dbCol} = $${idx}`)
        const val = data[domainKey]
        values.push(isJson && val != null ? JSON.stringify(val) : (val ?? null))
        idx++
      }
    }

    if (sets.length === 0) return this.findById(id)
    sets.push(`updated_at = NOW()`)
    values.push(id)

    const { rows } = await this.query<EventRow>(
      `UPDATE events SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
      values,
    )
    return rows[0] ? this.mapRow(rows[0]) : null
  }

  async softDelete(id: EntityId): Promise<void> {
    await this.query('UPDATE events SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1', [id])
  }

  async restore(id: EntityId): Promise<void> {
    await this.query('UPDATE events SET deleted_at = NULL, updated_at = NOW() WHERE id = $1', [id])
  }

  async getOverviewMetrics(eventId: EntityId): Promise<EventOverviewMetrics> {
    const { rows } = await this.query<{
      invited: string; registered: string; approved: string; attended: string
    }>(
      `SELECT
         (SELECT COUNT(*) FROM blast_logs WHERE event_id = $1) as invited,
         (SELECT COUNT(*) FROM registrations WHERE event_id = $1) as registered,
         (SELECT COUNT(*) FROM registrations WHERE event_id = $1 AND status = 'approved') as approved,
         (SELECT COUNT(*) FROM registrations WHERE event_id = $1 AND attendance_status = 'attended') as attended`,
      [eventId],
    )
    const row = rows[0]
    const invited = parseInt(row?.invited ?? '0', 10)
    const registered = parseInt(row?.registered ?? '0', 10)
    const approved = parseInt(row?.approved ?? '0', 10)
    const attended = parseInt(row?.attended ?? '0', 10)
    return {
      invited,
      registered,
      approved,
      attended,
      conversionRate: registered > 0 ? Math.round((attended / registered) * 1000) / 10 : 0,
    }
  }

  async getUpcomingUncontacted(): Promise<UpcomingUncontactedResult | null> {
    const { rows } = await this.query<{
      id: string; name: string; date: Date; uncontacted: string
    }>(
      `SELECT e.id, e.name, e.date,
         (e.capacity - COALESCE(
           (SELECT COUNT(*) FROM registrations r WHERE r.event_id = e.id AND r.status = 'approved'), 0
         )) as uncontacted
       FROM events e
       WHERE e.deleted_at IS NULL AND e.status IN ('published', 'active') AND e.date > NOW()
       ORDER BY e.date ASC LIMIT 1`,
    )
    const row = rows[0]
    if (!row) return null
    const daysTill = Math.ceil((row.date.getTime() - Date.now()) / 86400000)
    return {
      eventId: row.id,
      eventName: row.name,
      daysTillEvent: daysTill,
      uncontactedCount: Math.max(0, parseInt(row.uncontacted ?? '0', 10)),
    }
  }
}
