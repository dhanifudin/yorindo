import { createId } from '@paralleldrive/cuid2'
import type { Pool, QueryResultRow } from 'pg'
import type {
  IContactRepository,
  PaginationParams,
  ContactFilters,
} from '../../interfaces/repositories/IContactRepository.js'
import type {
  Contact,
  DuplicateFieldChoice,
  DuplicatePair,
  DuplicateMatchReason,
  FacetResult,
  EntityId,
} from '../../types/domain.js'
import { BasePostgresRepository } from './BasePostgresRepository.js'

interface ContactRow extends QueryResultRow {
  id: string
  name: string
  phone: string | null
  email: string | null
  service_type: string | null
  job_title: string | null
  city: string | null
  province_code: string | null
  province_name: string | null
  city_code: string | null
  city_name: string | null
  company: string | null
  department: string | null
  event_date: string | null
  topic_tags: string[] | null
  source: string | null
  completeness_score: string
  consent_status: string
  flag_category: string | null
  deleted_at: Date | null
  created_at: Date
  updated_at: Date
}

interface DuplicatePairRow extends QueryResultRow {
  id: string
  primary_id: string
  duplicate_id: string
  match_score: string
  match_reasons: unknown
  resolved_at: Date | null
}

export class PostgresContactRepository
  extends BasePostgresRepository
  implements IContactRepository
{
  constructor(pool: Pool) {
    super(pool)
  }

  private mapRow(row: ContactRow): Contact {
    return {
      id: row.id,
      name: row.name,
      phone: row.phone,
      email: row.email,
      serviceType: row.service_type,
      jobTitle: row.job_title,
      city: row.city,
      provinceCode: row.province_code,
      provinceName: row.province_name,
      cityCode: row.city_code,
      cityName: row.city_name,
      company: row.company,
      department: row.department,
      eventDate: row.event_date,
      topicTags: row.topic_tags ?? null,
      source: row.source as Contact['source'],
      completenessScore: Number(row.completeness_score),
      consentStatus: row.consent_status as Contact['consentStatus'],
      flagCategory: row.flag_category as Contact['flagCategory'],
      deletedAt: this.toIsoOrNull(row.deleted_at),
      createdAt: this.toIso(row.created_at),
      updatedAt: this.toIso(row.updated_at),
    }
  }

  private buildContactWhere(
    filters?: ContactFilters,
    includeDeleted = false,
  ): { conditions: string[]; values: unknown[] } {
    const conditions: string[] = []
    const values: unknown[] = []
    let idx = 1

    if (!includeDeleted) conditions.push('deleted_at IS NULL')

    if (filters?.search) {
      conditions.push(`(name ILIKE $${idx} OR email ILIKE $${idx} OR phone ILIKE $${idx})`)
      values.push(`%${filters.search}%`)
      idx++
    }
    if (filters?.serviceType) {
      conditions.push(`service_type = $${idx}`)
      values.push(filters.serviceType)
      idx++
    }
    if (filters?.serviceTypes?.length) {
      conditions.push(`service_type = ANY($${idx}::text[])`)
      values.push(filters.serviceTypes)
      idx++
    }
    if (filters?.city) {
      conditions.push(`city ILIKE $${idx}`)
      values.push(`%${filters.city}%`)
      idx++
    }
    if (filters?.cities?.length) {
      conditions.push(`city = ANY($${idx}::text[])`)
      values.push(filters.cities)
      idx++
    }
    if (filters?.jobTitle) {
      conditions.push(`job_title ILIKE $${idx}`)
      values.push(`%${filters.jobTitle}%`)
      idx++
    }
    if (filters?.jobTitles?.length) {
      conditions.push(`job_title = ANY($${idx}::text[])`)
      values.push(filters.jobTitles)
      idx++
    }
    if (filters?.topicTags?.length) {
      conditions.push(`topic_tags && $${idx}::text[]`)
      values.push(filters.topicTags)
      idx++
    }
    if (filters?.flagCategory === 'NONE') {
      conditions.push('flag_category IS NULL')
    } else if (filters?.flagCategory === 'ANY') {
      conditions.push('flag_category IS NOT NULL')
    } else if (filters?.flagCategory) {
      conditions.push(`flag_category = $${idx}`)
      values.push(filters.flagCategory)
      idx++
    }
    if (filters?.consentStatus) {
      conditions.push(`consent_status = $${idx}`)
      values.push(filters.consentStatus)
      idx++
    }
    if (filters?.missingEmail) {
      conditions.push('email IS NULL')
    }
    if (filters?.missingPhone) {
      conditions.push('phone IS NULL')
    }
    if (filters?.hasEmail) {
      conditions.push('email IS NOT NULL AND email <> \'\'')
    }
    if (filters?.hasPhone) {
      conditions.push('phone IS NOT NULL AND phone <> \'\'')
    }
    if (filters?.lastAttendedBefore) {
      conditions.push(`event_date < $${idx}`)
      values.push(filters.lastAttendedBefore)
      idx++
    }

    return { conditions, values }
  }

  async findAll(
    params: PaginationParams,
    filters?: ContactFilters,
  ): Promise<{ data: Contact[]; total: number }> {
    const { page, pageSize, sortBy = 'created_at', sortDir = 'desc' } = params
    const offset = (page - 1) * pageSize
    const { conditions, values } = this.buildContactWhere(filters)
    const where = conditions.length ? conditions.join(' AND ') : 'TRUE'

    const safeSort = ['created_at', 'name', 'updated_at', 'completeness_score'].includes(sortBy)
      ? sortBy
      : 'created_at'
    const safeDir = sortDir === 'asc' ? 'ASC' : 'DESC'

    const [countResult, dataResult] = await Promise.all([
      this.query<{ total: string }>(
        `SELECT COUNT(*) as total FROM contacts WHERE ${where}`,
        values,
      ),
      this.query<ContactRow>(
        `SELECT * FROM contacts WHERE ${where} ORDER BY ${safeSort} ${safeDir} LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
        [...values, pageSize, offset],
      ),
    ])

    return {
      data: dataResult.rows.map((r) => this.mapRow(r)),
      total: parseInt(countResult.rows[0]?.total ?? '0', 10),
    }
  }

  async findById(id: EntityId): Promise<Contact | null> {
    const { rows } = await this.query<ContactRow>(
      'SELECT * FROM contacts WHERE id = $1 AND deleted_at IS NULL',
      [id],
    )
    return rows[0] ? this.mapRow(rows[0]) : null
  }

  async findByPhone(phone: string | null): Promise<Contact | null> {
    if (!phone) return null
    const { rows } = await this.query<ContactRow>(
      'SELECT * FROM contacts WHERE phone = $1 AND deleted_at IS NULL ORDER BY created_at ASC LIMIT 1',
      [phone],
    )
    return rows[0] ? this.mapRow(rows[0]) : null
  }

  async findDuplicates(
    params: PaginationParams,
  ): Promise<{ data: DuplicatePair[]; total: number }> {
    const { page, pageSize } = params
    const offset = (page - 1) * pageSize

    const [countResult, pairResult] = await Promise.all([
      this.query<{ total: string }>(
        'SELECT COUNT(*) as total FROM duplicate_pairs WHERE resolved_at IS NULL',
      ),
      this.query<DuplicatePairRow>(
        `SELECT * FROM duplicate_pairs WHERE resolved_at IS NULL
         ORDER BY match_score DESC LIMIT $1 OFFSET $2`,
        [pageSize, offset],
      ),
    ])

    const pairs: DuplicatePair[] = []
    for (const row of pairResult.rows) {
      const [primary, duplicate] = await Promise.all([
        this.findById(row.primary_id),
        this.findById(row.duplicate_id),
      ])
      if (!primary || !duplicate) continue
      const reasons = typeof row.match_reasons === 'string'
        ? JSON.parse(row.match_reasons)
        : (row.match_reasons as DuplicateMatchReason[] ?? [])
      pairs.push({
        id: row.id,
        primary,
        duplicate,
        matchScore: Number(row.match_score),
        matchReasons: reasons,
      })
    }

    return { data: pairs, total: parseInt(countResult.rows[0]?.total ?? '0', 10) }
  }

  async dismissDuplicate(id: EntityId): Promise<boolean> {
    const { rows } = await this.query<DuplicatePairRow>(
      `UPDATE duplicate_pairs SET resolved_at = NOW() WHERE id = $1 RETURNING id`,
      [id],
    )
    return rows.length > 0
  }

  async mergeDuplicate(
    primaryId: EntityId,
    fieldSelections?: Record<string, DuplicateFieldChoice>,
  ): Promise<Contact | null> {
    return this.withTransaction(async (client) => {
      const [pRows, dRows] = await Promise.all([
        client.query<ContactRow>('SELECT * FROM contacts WHERE id = $1', [primaryId]),
        client.query<DuplicatePairRow>(
          'SELECT * FROM duplicate_pairs WHERE primary_id = $1 AND resolved_at IS NULL LIMIT 1',
          [primaryId],
        ),
      ])

      const primary = pRows.rows[0]
      const pair = dRows.rows[0]
      if (!primary || !pair) return null

      const { rows: dupRows } = await client.query<ContactRow>(
        'SELECT * FROM contacts WHERE id = $1',
        [pair.duplicate_id],
      )
      const dup = dupRows[0]
      if (!dup) return null

      const pick = (field: keyof ContactRow, col: string) => {
        const choice = fieldSelections?.[col]
        return choice === 'duplicate' ? dup[field] : primary[field]
      }

      const { rows: merged } = await client.query<ContactRow>(
        `UPDATE contacts SET
          name = $2, phone = $3, email = $4, service_type = $5, job_title = $6,
          city = $7, company = $8, department = $9, updated_at = NOW()
         WHERE id = $1 RETURNING *`,
        [
          primaryId,
          pick('name', 'name'),
          pick('phone', 'phone'),
          pick('email', 'email'),
          pick('service_type', 'serviceType'),
          pick('job_title', 'jobTitle'),
          pick('city', 'city'),
          pick('company', 'company'),
          pick('department', 'department'),
        ],
      )

      await client.query('UPDATE contacts SET deleted_at = NOW() WHERE id = $1', [dup.id])
      await client.query(
        'UPDATE duplicate_pairs SET resolved_at = NOW() WHERE id = $1',
        [pair.id],
      )

      return merged[0] ? this.mapRow(merged[0]) : null
    })
  }

  async createDuplicatePair(data: Omit<DuplicatePair, 'id' | 'resolvedAt'>): Promise<void> {
    await this.query(
      `INSERT INTO duplicate_pairs (id, primary_id, duplicate_id, match_score, match_reasons)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (primary_id, duplicate_id) DO NOTHING`,
      [
        createId(),
        data.primary.id,
        data.duplicate.id,
        data.matchScore,
        JSON.stringify(data.matchReasons),
      ],
    )
  }

  async upsert(data: Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>): Promise<Contact> {
    return this.withTransaction(async (client) => {
      // Detect collision: phone first (stronger signal), then email
      let existingMatch: ContactRow | null = null
      let matchReasons: string[] = []

      if (data.phone) {
        const { rows } = await client.query<ContactRow>(
          'SELECT * FROM contacts WHERE phone = $1 AND deleted_at IS NULL ORDER BY created_at ASC LIMIT 1',
          [data.phone],
        )
        if (rows[0]) {
          existingMatch = rows[0]
          matchReasons = ['same_phone']
        }
      }

      if (!existingMatch && data.email) {
        const { rows } = await client.query<ContactRow>(
          'SELECT * FROM contacts WHERE lower(email) = lower($1) AND deleted_at IS NULL ORDER BY created_at ASC LIMIT 1',
          [data.email],
        )
        if (rows[0]) {
          existingMatch = rows[0]
          matchReasons = ['same_email']
        }
      }

      const flagCategory = existingMatch ? 'duplicate' : (data.flagCategory ?? null)
      const newId = createId()

      const { rows } = await client.query<ContactRow>(
        `INSERT INTO contacts (
           id, name, phone, email, service_type, job_title,
           city, province_code, province_name, city_code, city_name,
           company, department, event_date, source,
           completeness_score, consent_status, flag_category, deleted_at
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
         RETURNING *`,
        [
          newId,
          data.name,
          data.phone,
          data.email,
          data.serviceType,
          data.jobTitle,
          data.city,
          data.provinceCode,
          data.provinceName,
          data.cityCode,
          data.cityName,
          data.company,
          data.department,
          data.eventDate,
          data.source,
          data.completenessScore,
          data.consentStatus,
          flagCategory,
          data.deletedAt,
        ],
      )

      if (existingMatch) {
        const matchScore = matchReasons.includes('same_phone') ? 0.95 : 0.85
        await client.query(
          `INSERT INTO duplicate_pairs (id, primary_id, duplicate_id, match_score, match_reasons)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (primary_id, duplicate_id) DO NOTHING`,
          [createId(), existingMatch.id, newId, matchScore, JSON.stringify(matchReasons)],
        )
      }

      return this.mapRow(rows[0]!)
    })
  }

  async update(id: EntityId, data: Partial<Contact>): Promise<Contact | null> {
    const sets: string[] = []
    const values: unknown[] = []
    let idx = 1

    const fieldMap: Array<[keyof Contact, string]> = [
      ['name', 'name'],
      ['phone', 'phone'],
      ['email', 'email'],
      ['serviceType', 'service_type'],
      ['jobTitle', 'job_title'],
      ['city', 'city'],
      ['provinceCode', 'province_code'],
      ['provinceName', 'province_name'],
      ['cityCode', 'city_code'],
      ['cityName', 'city_name'],
      ['company', 'company'],
      ['department', 'department'],
      ['eventDate', 'event_date'],
      ['source', 'source'],
      ['completenessScore', 'completeness_score'],
      ['consentStatus', 'consent_status'],
      ['flagCategory', 'flag_category'],
      ['deletedAt', 'deleted_at'],
    ]

    for (const [domainKey, dbCol] of fieldMap) {
      if (domainKey in data) {
        sets.push(`${dbCol} = $${idx}`)
        values.push(data[domainKey] ?? null)
        idx++
      }
    }

    if (sets.length === 0) return this.findById(id)

    sets.push(`updated_at = NOW()`)
    values.push(id)

    const { rows } = await this.query<ContactRow>(
      `UPDATE contacts SET ${sets.join(', ')} WHERE id = $${idx} AND deleted_at IS NULL RETURNING *`,
      values,
    )
    return rows[0] ? this.mapRow(rows[0]) : null
  }

  async softDelete(id: EntityId): Promise<void> {
    await this.query(
      'UPDATE contacts SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1',
      [id],
    )
  }

  async countHealth(): Promise<{ flagged: number; duplicates: number; missingEmail: number; missingPhone: number }> {
    const [flagged, duplicates, missingEmail, missingPhone] = await Promise.all([
      this.query<{ total: string }>(`SELECT COUNT(*) as total FROM contacts WHERE flag_category IS NOT NULL AND deleted_at IS NULL`),
      this.query<{ total: string }>(`SELECT COUNT(*) as total FROM duplicate_pairs WHERE resolved_at IS NULL`),
      this.query<{ total: string }>(`SELECT COUNT(*) as total FROM contacts WHERE email IS NULL AND deleted_at IS NULL`),
      this.query<{ total: string }>(`SELECT COUNT(*) as total FROM contacts WHERE phone IS NULL AND deleted_at IS NULL`),
    ])
    return {
      flagged: parseInt(flagged.rows[0]?.total ?? '0', 10),
      duplicates: parseInt(duplicates.rows[0]?.total ?? '0', 10),
      missingEmail: parseInt(missingEmail.rows[0]?.total ?? '0', 10),
      missingPhone: parseInt(missingPhone.rows[0]?.total ?? '0', 10),
    }
  }

  async findFacets(): Promise<FacetResult> {
    const [serviceTypes, cities] = await Promise.all([
      this.query<{ slug: string; label: string; count: string }>(
        `SELECT LOWER(service_type) as slug, service_type as label, COUNT(*) as count
         FROM contacts WHERE service_type IS NOT NULL AND deleted_at IS NULL
         GROUP BY service_type ORDER BY count DESC`,
      ),
      this.query<{ slug: string; label: string; count: string }>(
        `SELECT LOWER(city) as slug, city as label, COUNT(*) as count
         FROM contacts WHERE city IS NOT NULL AND deleted_at IS NULL
         GROUP BY city ORDER BY count DESC LIMIT 50`,
      ),
    ])
    return {
      serviceType: serviceTypes.rows.map((r) => ({
        slug: r.slug,
        label: r.label,
        count: parseInt(r.count, 10),
      })),
      city: cities.rows.map((r) => ({
        slug: r.slug,
        label: r.label,
        count: parseInt(r.count, 10),
      })),
    }
  }

  async anonymize(id: EntityId, hashedPhone: string): Promise<void> {
    await this.query(
      `UPDATE contacts SET
         name = 'Anonymized', email = NULL, phone = $2,
         company = NULL, department = NULL, city = NULL,
         province_code = NULL, province_name = NULL, city_code = NULL, city_name = NULL,
         updated_at = NOW()
       WHERE id = $1`,
      [id, hashedPhone],
    )
  }

  async existsByPhoneHash(hashedPhone: string): Promise<boolean> {
    const { rows } = await this.query<{ exists: boolean }>(
      `SELECT EXISTS(SELECT 1 FROM contacts WHERE phone = $1) as exists`,
      [hashedPhone],
    )
    return rows[0]?.exists ?? false
  }
}
