import type { IAuditLogRepository } from '../../interfaces/repositories/IAuditLogRepository.js'
import type { AuditLog } from '../../types/domain.js'

import { createId } from '@paralleldrive/cuid2'

export class InMemoryAuditLogRepository implements IAuditLogRepository {
  private logs: Map<string, AuditLog> = new Map()

  async create(data: Omit<AuditLog, 'id' | 'createdAt'>): Promise<AuditLog> {
    const id = createId()
    const log: AuditLog = {
      ...data,
      id,
      createdAt: new Date().toISOString()
    }
    this.logs.set(id, log)
    return log
  }

  async findAllByTarget(targetId: string): Promise<AuditLog[]> {
    return Array.from(this.logs.values()).filter(log => log.targetId === targetId)
  }
}
