import { faker } from '@faker-js/faker'
import type { IRegistrationRepository, RegistrationFilters } from '../../interfaces/repositories/IRegistrationRepository.js'
import type { PaginationParams } from '../../interfaces/repositories/IContactRepository.js'
import type { Registration, RegistrationStatus, ConfirmationStats, BlastHistoryEntry } from '../../types/domain.js'

faker.seed(42)

export class InMemoryRegistrationRepository implements IRegistrationRepository {
  private registrations: Map<string, Registration> = new Map()
  private blastHistory: Map<string, BlastHistoryEntry[]> = new Map()

  constructor(eventIds?: string[], contactIds?: string[]) {
    this._seed(eventIds, contactIds)
  }

  private _seed(eventIds?: string[], contactIds?: string[]): void {
    const eIds = eventIds ?? [crypto.randomUUID(), crypto.randomUUID()]
    const cIds = contactIds ?? Array.from({ length: 30 }, () => crypto.randomUUID())
    const statuses: RegistrationStatus[] = ['pending', 'approved', 'rejected', 'waitlisted', 'attended']

    for (let i = 0; i < 20; i++) {
      const id = crypto.randomUUID()
      const status = statuses[i % statuses.length]!
      const reg: Registration = {
        id,
        contactId: cIds[i % cIds.length]!,
        eventId: eIds[i % eIds.length]!,
        status,
        ticketToken: status === 'approved' || status === 'attended' ? crypto.randomUUID() : null,
        aiScore: Math.round((0.3 + (i % 8) * 0.09) * 1000) / 1000,
        flagOverride: false,
        approvedAt: status === 'approved' || status === 'attended' ? new Date().toISOString() : null,
        attendedAt: status === 'attended' ? new Date().toISOString() : null,
        createdAt: new Date(Date.now() - i * 3600000).toISOString(),
      }
      this.registrations.set(id, reg)
    }
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

  async create(data: Omit<Registration, 'id' | 'createdAt'>): Promise<Registration> {
    const reg: Registration = {
      id: crypto.randomUUID(),
      ...data,
      createdAt: new Date().toISOString(),
    }
    this.registrations.set(reg.id, reg)
    return reg
  }

  async updateStatus(id: string, status: RegistrationStatus): Promise<Registration | null> {
    const existing = this.registrations.get(id)
    if (!existing) return null
    const updated: Registration = {
      ...existing,
      status,
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
