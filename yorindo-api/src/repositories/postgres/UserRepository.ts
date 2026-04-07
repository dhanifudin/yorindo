import type { Pool, QueryResultRow } from 'pg'
import type { IUserRepository, UserEventAssignmentRecord } from '../../interfaces/repositories/IUserRepository.js'
import type { PaginationParams } from '../../interfaces/repositories/IContactRepository.js'
import type { User, EntityId } from '../../types/domain.js'
import { BasePostgresRepository } from './BasePostgresRepository.js'

interface UserRow extends QueryResultRow {
  id: string
  email: string
  password_hash: string
  role: string
  name: string | null
  created_at: Date
  updated_at: Date
  deleted_at: Date | null
}

export class PostgresUserRepository
  extends BasePostgresRepository
  implements IUserRepository
{
  constructor(pool: Pool) {
    super(pool)
  }

  private mapRow(row: UserRow): User {
    return {
      id: row.id,
      email: row.email,
      passwordHash: row.password_hash,
      role: row.role as User['role'],
      name: row.name,
      createdAt: this.toIso(row.created_at),
      updatedAt: this.toIso(row.updated_at),
      deletedAt: this.toIsoOrNull(row.deleted_at),
    }
  }

  async findAll(params: PaginationParams): Promise<{ data: User[]; total: number }> {
    const { page, pageSize } = params
    const offset = (page - 1) * pageSize

    const [countResult, dataResult] = await Promise.all([
      this.query<{ total: string }>('SELECT COUNT(*) as total FROM users WHERE deleted_at IS NULL'),
      this.query<UserRow>(
        'SELECT * FROM users WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT $1 OFFSET $2',
        [pageSize, offset],
      ),
    ])

    return {
      data: dataResult.rows.map((r) => this.mapRow(r)),
      total: parseInt(countResult.rows[0]?.total ?? '0', 10),
    }
  }

  async findById(id: EntityId): Promise<User | null> {
    const { rows } = await this.query<UserRow>(
      'SELECT * FROM users WHERE id = $1 AND deleted_at IS NULL',
      [id],
    )
    return rows[0] ? this.mapRow(rows[0]) : null
  }

  async findByIdIncludingDeleted(id: EntityId): Promise<User | null> {
    const { rows } = await this.query<UserRow>('SELECT * FROM users WHERE id = $1', [id])
    return rows[0] ? this.mapRow(rows[0]) : null
  }

  async findByEmail(email: string): Promise<User | null> {
    const { rows } = await this.query<UserRow>(
      'SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL',
      [email],
    )
    return rows[0] ? this.mapRow(rows[0]) : null
  }

  async create(data: Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>): Promise<User> {
    const { rows } = await this.query<UserRow>(
      `INSERT INTO users (email, password_hash, role, name) VALUES ($1,$2,$3,$4) RETURNING *`,
      [data.email, data.passwordHash, data.role, data.name],
    )
    return this.mapRow(rows[0]!)
  }

  async update(id: EntityId, data: Partial<User>): Promise<User | null> {
    const sets: string[] = []
    const values: unknown[] = []
    let idx = 1

    if ('email' in data) { sets.push(`email = $${idx++}`); values.push(data.email) }
    if ('passwordHash' in data) { sets.push(`password_hash = $${idx++}`); values.push(data.passwordHash) }
    if ('role' in data) { sets.push(`role = $${idx++}`); values.push(data.role) }
    if ('name' in data) { sets.push(`name = $${idx++}`); values.push(data.name) }

    if (sets.length === 0) return this.findById(id)
    sets.push(`updated_at = NOW()`)
    values.push(id)

    const { rows } = await this.query<UserRow>(
      `UPDATE users SET ${sets.join(', ')} WHERE id = $${idx} AND deleted_at IS NULL RETURNING *`,
      values,
    )
    return rows[0] ? this.mapRow(rows[0]) : null
  }

  async delete(id: EntityId): Promise<void> {
    await this.query(
      'UPDATE users SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1',
      [id],
    )
  }

  async assignEvent(
    userId: EntityId,
    eventId: EntityId,
    grantedById: EntityId,
  ): Promise<UserEventAssignmentRecord> {
    const { rows } = await this.query<{
      user_id: string; event_id: string; granted_by: string; granted_at: Date
    }>(
      `INSERT INTO user_events (user_id, event_id, granted_by, granted_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (user_id, event_id) DO UPDATE SET granted_by = $3, granted_at = NOW()
       RETURNING user_id, event_id, granted_by, granted_at`,
      [userId, eventId, grantedById],
    )
    const row = rows[0]!
    return {
      userId: row.user_id,
      eventId: row.event_id,
      grantedById: row.granted_by,
      grantedAt: this.toIso(row.granted_at),
    }
  }

  async getAssignedEvents(userId: EntityId): Promise<EntityId[]> {
    const { rows } = await this.query<{ event_id: string }>(
      'SELECT event_id FROM user_events WHERE user_id = $1',
      [userId],
    )
    return rows.map((r) => r.event_id)
  }

  async revokeEvent(userId: EntityId, eventId: EntityId): Promise<void> {
    await this.query(
      'DELETE FROM user_events WHERE user_id = $1 AND event_id = $2',
      [userId, eventId],
    )
  }
}
