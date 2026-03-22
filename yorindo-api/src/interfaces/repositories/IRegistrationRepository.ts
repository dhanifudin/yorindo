import type { Registration, RegistrationStatus, ConfirmationStats, BlastHistoryEntry, UUID } from '../../types/domain.js'
import type { PaginationParams } from './IContactRepository.js'

export interface RegistrationFilters {
  status?: RegistrationStatus
  aiScoreMin?: number
  aiScoreMax?: number
  flagged?: boolean
}

export interface IRegistrationRepository {
  findByEvent(eventId: UUID, params: PaginationParams, filters?: RegistrationFilters): Promise<{ data: Registration[]; total: number }>
  findById(id: UUID): Promise<Registration | null>
  create(data: Omit<Registration, 'id' | 'createdAt'>): Promise<Registration>
  updateStatus(id: UUID, status: RegistrationStatus): Promise<Registration | null>
  bulkApprove(ids: UUID[]): Promise<{ approved: number }>
  getConfirmationStats(eventId: UUID): Promise<ConfirmationStats>
  getBlastHistory(eventId: UUID): Promise<BlastHistoryEntry[]>
}
