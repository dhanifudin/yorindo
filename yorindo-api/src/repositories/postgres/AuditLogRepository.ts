import type { Pool, QueryResultRow } from 'pg'
import { createId } from '@paralleldrive/cuid2'
import type { IAuditLogRepository } from '../../interfaces/repositories/IAuditLogRepository.js'
import type { AuditLog } from '../../types/domain.js'
import { BasePostgresRepository } from './BasePostgresRepository.js'

interface AuditLogRow extends QueryResultRow {
  id: string
  action: string
  actor_id: string | null
  actor_role: string
  event_id: string | null
  target_id: string | null
  target_type: string | null
  metadata: unknown
  created_at: Date
}

export class PostgresAuditLogRepository
  extends BasePostgresRepository
  implements IAuditLogRepository
{
  constructor(pool: Pool) {
    super(pool)
  }

  private mapRow(row: AuditLogRow): AuditLog {
    return {
      id: row.id,
      action: row.action,
      actorId: row.actor_id,
      actorRole: row.actor_role,
      eventId: row.event_id,
      targetId: row.target_id,
      targetType: row.target_type,
      metadata: row.metadata as AuditLog['metadata'],
      createdAt: this.toIso(row.created_at),
    }
  }

  async create(data: Omit<AuditLog, 'id' | 'createdAt'>): Promise<AuditLog> {
    const { rows } = await this.query<AuditLogRow>(
      `INSERT INTO audit_logs (id, action, actor_id, actor_role, event_id, target_id, target_type, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [
        createId(),
        data.action,
        data.actorId,
        data.actorRole,
        data.eventId,
        data.targetId,
        data.targetType,
        data.metadata ? JSON.stringify(data.metadata) : null,
      ],
    )
    return this.mapRow(rows[0]!)
  }

  async findAllByTarget(targetId: string): Promise<AuditLog[]> {
    const { rows } = await this.query<AuditLogRow>(
      'SELECT * FROM audit_logs WHERE target_id = $1 ORDER BY created_at DESC',
      [targetId],
    )
    return rows.map((r) => this.mapRow(r))
  }

  async findAll(filters?: { action?: string }): Promise<AuditLog[]> {
    try {
      let sql = 'SELECT * FROM audit_logs'
      const params: unknown[] = []
      if (filters?.action) {
        sql += ' WHERE action = $1'
        params.push(filters.action)
      }
      sql += ' ORDER BY created_at DESC'
      const { rows } = await this.query<AuditLogRow>(sql, params)
      return (rows ?? []).map((r) => this.mapRow(r))
    } catch {
      return []
    }
  }
}
