import type { IAuditLogRepository } from '../../interfaces/repositories/IAuditLogRepository.js'
import type { AuditLog } from '../../types/domain.js'
import { createId } from '@paralleldrive/cuid2'
import { SEED_USER_IDS, SEED_EVENT_IDS, SEED_CONTACT_IDS } from './_seeds.js'

const SEED_ENTRIES: Array<Omit<AuditLog, 'id' | 'createdAt'> & { daysAgo: number }> = [
  { action: 'user.login', actorId: SEED_USER_IDS.admin, actorRole: 'admin', eventId: null, targetId: SEED_USER_IDS.admin, targetType: 'user', metadata: { ip: '103.10.10.1' }, daysAgo: 14 },
  { action: 'user.login', actorId: SEED_USER_IDS.staff, actorRole: 'staff', eventId: null, targetId: SEED_USER_IDS.staff, targetType: 'user', metadata: { ip: '103.10.10.2' }, daysAgo: 13 },
  { action: 'event.create', actorId: SEED_USER_IDS.admin, actorRole: 'admin', eventId: SEED_EVENT_IDS[0]!, targetId: SEED_EVENT_IDS[0]!, targetType: 'event', metadata: { name: 'Tech Summit Jakarta 2026' }, daysAgo: 12 },
  { action: 'event.create', actorId: SEED_USER_IDS.admin, actorRole: 'admin', eventId: SEED_EVENT_IDS[2]!, targetId: SEED_EVENT_IDS[2]!, targetType: 'event', metadata: { name: 'Konferensi Kesehatan Nasional' }, daysAgo: 11 },
  { action: 'event.status_change', actorId: SEED_USER_IDS.admin, actorRole: 'admin', eventId: SEED_EVENT_IDS[2]!, targetId: SEED_EVENT_IDS[2]!, targetType: 'event', metadata: { from: 'draft', to: 'published' }, daysAgo: 10 },
  { action: 'event.status_change', actorId: SEED_USER_IDS.admin, actorRole: 'admin', eventId: SEED_EVENT_IDS[4]!, targetId: SEED_EVENT_IDS[4]!, targetType: 'event', metadata: { from: 'published', to: 'active' }, daysAgo: 9 },
  { action: 'registration.approve', actorId: SEED_USER_IDS.staff, actorRole: 'staff', eventId: SEED_EVENT_IDS[4]!, targetId: 'cuid2reg0000000000000003', targetType: 'registration', metadata: { contactId: SEED_CONTACT_IDS[2] }, daysAgo: 8 },
  { action: 'registration.approve', actorId: SEED_USER_IDS.staff, actorRole: 'staff', eventId: SEED_EVENT_IDS[5]!, targetId: 'cuid2reg0000000000000010', targetType: 'registration', metadata: { contactId: SEED_CONTACT_IDS[9] }, daysAgo: 8 },
  { action: 'registration.reject', actorId: SEED_USER_IDS.staff, actorRole: 'staff', eventId: SEED_EVENT_IDS[5]!, targetId: 'cuid2reg0000000000000004', targetType: 'registration', metadata: { reason: 'Data tidak lengkap' }, daysAgo: 7 },
  { action: 'contact.flag', actorId: SEED_USER_IDS.staff, actorRole: 'staff', eventId: null, targetId: SEED_CONTACT_IDS[14]!, targetType: 'contact', metadata: { category: 'invalid-data' }, daysAgo: 7 },
  { action: 'contact.flag', actorId: SEED_USER_IDS.staff, actorRole: 'staff', eventId: null, targetId: SEED_CONTACT_IDS[21]!, targetType: 'contact', metadata: { category: 'duplicate' }, daysAgo: 6 },
  { action: 'blast.send', actorId: SEED_USER_IDS.admin, actorRole: 'admin', eventId: SEED_EVENT_IDS[4]!, targetId: SEED_EVENT_IDS[4]!, targetType: 'event', metadata: { channel: 'whatsapp', recipientCount: 87 }, daysAgo: 6 },
  { action: 'blast.send', actorId: SEED_USER_IDS.admin, actorRole: 'admin', eventId: SEED_EVENT_IDS[5]!, targetId: SEED_EVENT_IDS[5]!, targetType: 'event', metadata: { channel: 'email', recipientCount: 134 }, daysAgo: 5 },
  { action: 'event.status_change', actorId: SEED_USER_IDS.admin, actorRole: 'admin', eventId: SEED_EVENT_IDS[6]!, targetId: SEED_EVENT_IDS[6]!, targetType: 'event', metadata: { from: 'active', to: 'completed' }, daysAgo: 4 },
  { action: 'registration.approve', actorId: SEED_USER_IDS.staff, actorRole: 'staff', eventId: SEED_EVENT_IDS[6]!, targetId: 'cuid2reg0000000000000017', targetType: 'registration', metadata: { contactId: SEED_CONTACT_IDS[16] }, daysAgo: 4 },
  { action: 'user.login', actorId: SEED_USER_IDS.viewer, actorRole: 'viewer', eventId: null, targetId: SEED_USER_IDS.viewer, targetType: 'user', metadata: { ip: '103.10.10.5' }, daysAgo: 3 },
  { action: 'contact.flag', actorId: SEED_USER_IDS.admin, actorRole: 'admin', eventId: null, targetId: SEED_CONTACT_IDS[44]!, targetType: 'contact', metadata: { category: 'invalid-data' }, daysAgo: 2 },
  { action: 'blast.send', actorId: SEED_USER_IDS.admin, actorRole: 'admin', eventId: SEED_EVENT_IDS[3]!, targetId: SEED_EVENT_IDS[3]!, targetType: 'event', metadata: { channel: 'email', recipientCount: 210 }, daysAgo: 2 },
  { action: 'event.create', actorId: SEED_USER_IDS.admin, actorRole: 'admin', eventId: SEED_EVENT_IDS[1]!, targetId: SEED_EVENT_IDS[1]!, targetType: 'event', metadata: { name: 'Workshop Digital Marketing B2B' }, daysAgo: 1 },
  { action: 'user.login', actorId: SEED_USER_IDS.admin, actorRole: 'admin', eventId: null, targetId: SEED_USER_IDS.admin, targetType: 'user', metadata: { ip: '103.10.10.1' }, daysAgo: 0 },
]

export class InMemoryAuditLogRepository implements IAuditLogRepository {
  private logs: Map<string, AuditLog> = new Map()

  constructor() {
    this._seed()
  }

  private _seed(): void {
    for (const { daysAgo, ...entry } of SEED_ENTRIES) {
      const id = createId()
      const log: AuditLog = {
        ...entry,
        id,
        createdAt: new Date(Date.now() - daysAgo * 86400000).toISOString(),
      }
      this.logs.set(id, log)
    }
  }

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

  async findAll(filters?: { action?: string }): Promise<AuditLog[]> {
    let results = Array.from(this.logs.values())
    if (filters?.action) {
      results = results.filter(log => log.action === filters.action)
    }
    return results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }
}
