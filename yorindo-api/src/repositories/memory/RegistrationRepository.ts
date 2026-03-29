import { faker } from '@faker-js/faker'
import { createId } from '@paralleldrive/cuid2'
import type { IRegistrationRepository, RegistrationFilters } from '../../interfaces/repositories/IRegistrationRepository.js'
import type { PaginationParams } from '../../interfaces/repositories/IContactRepository.js'
import type { Registration, RegistrationStatus, ConfirmationStats, BlastHistoryEntry } from '../../types/domain.js'
import { SEED_EVENT_IDS, SEED_CONTACT_IDS, SEED_REGISTRATION_IDS } from './_seeds.js'

faker.seed(42)

const ALL_STATUSES: RegistrationStatus[] = [
  'pending', 'confirmed', 'approved', 'rejected', 'waitlisted', 'attended', 'cancelled',
]

export class InMemoryRegistrationRepository implements IRegistrationRepository {
  private registrations: Map<string, Registration> = new Map()
  private blastHistory: Map<string, BlastHistoryEntry[]> = new Map()

  constructor() {
    this._seed()
  }

  private _seed(): void {
    const now = Date.now()
    let attendedSeedCount = 0

    // Distribute 60 registrations across active/published/completed events (indices 2–7)
    const activeEventIds = [
      SEED_EVENT_IDS[2]!, SEED_EVENT_IDS[3]!,  // published
      SEED_EVENT_IDS[4]!, SEED_EVENT_IDS[5]!,  // active
      SEED_EVENT_IDS[6]!, SEED_EVENT_IDS[7]!,  // completed
    ]

    for (let i = 0; i < 60; i++) {
      const id = SEED_REGISTRATION_IDS[i]!
      const contactId = SEED_CONTACT_IDS[i % 80]!     // use first 80 contacts
      const status = ALL_STATUSES[i % ALL_STATUSES.length]!
      const eventId = status === 'attended' && attendedSeedCount < 5
        ? SEED_EVENT_IDS[2]!
        : activeEventIds[i % activeEventIds.length]!

      const hasTicket = status === 'approved' || status === 'attended'
      const isAttended = status === 'attended'
      const isApproved = status === 'approved' || status === 'attended'

      if (isAttended && attendedSeedCount < 5) attendedSeedCount++

      const reg: Registration = {
        id,
        contactId,
        eventId,
        status,
        ticketToken: hasTicket ? `ticket-${createId()}` : null,
        aiScore: Math.round((0.3 + (i % 8) * 0.09) * 1000) / 1000,
        flagOverride: i % 12 === 0,   // ~5 entries flagged
        approvedAt: isApproved ? new Date(now - (60 - i) * 3600000).toISOString() : null,
        attendedAt: isAttended ? new Date(now - (30 - i % 30) * 3600000).toISOString() : null,
        createdAt: new Date(now - i * 3600000 * 2).toISOString(),
      }
      this.registrations.set(id, reg)
    }

    // Blast history for active and completed events
    const blastEventIds = [SEED_EVENT_IDS[4]!, SEED_EVENT_IDS[5]!, SEED_EVENT_IDS[6]!, SEED_EVENT_IDS[7]!]
    for (const eventId of blastEventIds) {
      this.blastHistory.set(eventId, [
        {
          id: createId(),
          channel: 'whatsapp',
          sentAt: new Date(now - 10 * 86400000).toISOString(),
          recipientCount: faker.number.int({ min: 50, max: 200 }),
          status: 'completed',
        },
        {
          id: createId(),
          channel: 'email',
          sentAt: new Date(now - 5 * 86400000).toISOString(),
          recipientCount: faker.number.int({ min: 50, max: 200 }),
          status: 'completed',
        },
      ])
    }
  }

  async findAll(params: PaginationParams, filters?: RegistrationFilters): Promise<{ data: Registration[]; total: number }> {
    let data = Array.from(this.registrations.values())

    if (filters?.eventId) data = data.filter(r => r.eventId === filters.eventId)
    if (filters?.status) data = data.filter(r => r.status === filters.status)
    if (filters?.flagged) data = data.filter(r => r.flagOverride)
    if (filters?.aiScoreMin !== undefined) data = data.filter(r => (r.aiScore ?? 0) >= filters.aiScoreMin!)
    if (filters?.aiScoreMax !== undefined) data = data.filter(r => (r.aiScore ?? 0) <= filters.aiScoreMax!)

    const total = data.length
    const start = (params.page - 1) * params.pageSize
    return { data: data.slice(start, start + params.pageSize), total }
  }

  async findByEvent(eventId: string, params: PaginationParams, filters?: RegistrationFilters): Promise<{ data: Registration[]; total: number }> {
    let data = Array.from(this.registrations.values()).filter(r => r.eventId === eventId)

    if (filters?.status) data = data.filter(r => r.status === filters.status)
    if (filters?.flagged) data = data.filter(r => r.flagOverride)
    if (filters?.aiScoreMin !== undefined) data = data.filter(r => (r.aiScore ?? 0) >= filters.aiScoreMin!)
    if (filters?.aiScoreMax !== undefined) data = data.filter(r => (r.aiScore ?? 0) <= filters.aiScoreMax!)

    const total = data.length
    const start = (params.page - 1) * params.pageSize
    return { data: data.slice(start, start + params.pageSize), total }
  }

  async findById(id: string): Promise<Registration | null> {
    return this.registrations.get(id) ?? null
  }

  async findByTicketToken(ticketToken: string): Promise<Registration | null> {
    return Array.from(this.registrations.values()).find(reg => reg.ticketToken === ticketToken) ?? null
  }

  async create(data: Omit<Registration, 'id' | 'createdAt'>): Promise<Registration> {
    const reg: Registration = {
      id: createId(),
      ...data,
      createdAt: new Date().toISOString(),
    }
    this.registrations.set(reg.id, reg)
    return reg
  }

  async update(id: string, data: Partial<Registration>): Promise<Registration | null> {
    const existing = this.registrations.get(id)
    if (!existing) return null
    const updated: Registration = {
      ...existing,
      ...data,
      id,
    }
    this.registrations.set(id, updated)
    return updated
  }

  async updateStatus(id: string, status: RegistrationStatus): Promise<Registration | null> {
    const existing = this.registrations.get(id)
    if (!existing) return null
    const updated: Registration = {
      ...existing,
      status,
      ticketToken: (status === 'approved' || status === 'attended') ? (existing.ticketToken ?? `ticket-${createId()}`) : existing.ticketToken,
      approvedAt: status === 'approved' ? new Date().toISOString() : existing.approvedAt,
      attendedAt: status === 'attended' ? new Date().toISOString() : existing.attendedAt,
    }
    this.registrations.set(id, updated)
    return updated
  }

  async bulkApprove(ids: string[]): Promise<{ approved: number }> {
    let approved = 0
    for (const id of ids) {
      const result = await this.updateStatus(id, 'approved')
      if (result) approved++
    }
    return { approved }
  }

  async getConfirmationStats(eventId: string): Promise<ConfirmationStats> {
    const regs = Array.from(this.registrations.values()).filter(r => r.eventId === eventId)
    return {
      ticketsSent: regs.filter(r => r.ticketToken !== null).length,
      awaitingConfirmation: regs.filter(r => r.status === 'approved' && !r.attendedAt).length,
      waitlisted: regs.filter(r => r.status === 'waitlisted').length,
    }
  }

  async getBlastHistory(eventId: string): Promise<BlastHistoryEntry[]> {
    return this.blastHistory.get(eventId) ?? []
  }
}
