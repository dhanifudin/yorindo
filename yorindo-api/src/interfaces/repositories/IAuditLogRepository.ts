import type { AuditLog } from '../../types/domain.js'

export interface IAuditLogRepository {
  create(data: Omit<AuditLog, 'id' | 'createdAt'>): Promise<AuditLog>
  findAllByTarget(targetId: string): Promise<AuditLog[]>
  findAll(filters?: { action?: string }): Promise<AuditLog[]>
}
