import type { FlaggedRecord, FlaggedRecordStatus, Contact, EntityId } from '../../types/domain.js'
import type { PaginationParams } from './IContactRepository.js'

export interface IFlaggedRecordsRepository {
  findAll(params: PaginationParams, status?: FlaggedRecordStatus): Promise<{ data: FlaggedRecord[]; total: number }>
  findById(id: EntityId): Promise<FlaggedRecord | null>
  create(data: Omit<FlaggedRecord, 'id' | 'createdAt'>): Promise<FlaggedRecord>
  resolve(id: EntityId, resolvedData: Partial<Contact>, resolvedById: EntityId): Promise<void>
  discard(id: EntityId, resolvedById: EntityId): Promise<void>
}
