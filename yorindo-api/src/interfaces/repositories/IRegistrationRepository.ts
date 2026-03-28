import type { Registration, RegistrationStatus, ConfirmationStats, BlastHistoryEntry, EntityId } from '../../types/domain.js'
import type { PaginationParams } from './IContactRepository.js'

export interface RegistrationFilters {
  eventId?: EntityId
  status?: RegistrationStatus
  aiScoreMin?: number
  aiScoreMax?: number
  flagged?: boolean
}

export interface IRegistrationRepository {
  findAll(params: PaginationParams, filters?: RegistrationFilters): Promise<{ data: Registration[]; total: number }>
  findByEvent(eventId: EntityId, params: PaginationParams, filters?: RegistrationFilters): Promise<{ data: Registration[]; total: number }>
  findById(id: EntityId): Promise<Registration | null>
  findByTicketToken(ticketToken: string): Promise<Registration | null>
  create(data: Omit<Registration, 'id' | 'createdAt'>): Promise<Registration>
  update(id: EntityId, data: Partial<Registration>): Promise<Registration | null>
  updateStatus(id: EntityId, status: RegistrationStatus): Promise<Registration | null>
  bulkApprove(ids: EntityId[]): Promise<{ approved: number }>
  getConfirmationStats(eventId: EntityId): Promise<ConfirmationStats>
  getBlastHistory(eventId: EntityId): Promise<BlastHistoryEntry[]>
}
