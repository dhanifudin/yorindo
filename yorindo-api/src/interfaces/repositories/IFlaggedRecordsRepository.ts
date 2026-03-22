import type { FlaggedRecord, FlaggedRecordStatus, Contact, UUID } from '../../types/domain.js'
import type { PaginationParams } from './IContactRepository.js'

export interface IFlaggedRecordsRepository {
  findAll(params: PaginationParams, status?: FlaggedRecordStatus): Promise<{ data: FlaggedRecord[]; total: number }>
  findById(id: UUID): Promise<FlaggedRecord | null>
  create(data: Omit<FlaggedRecord, 'id' | 'createdAt'>): Promise<FlaggedRecord>
  resolve(id: UUID, resolvedData: Partial<Contact>, resolvedById: UUID): Promise<void>
  discard(id: UUID, resolvedById: UUID): Promise<void>
}
