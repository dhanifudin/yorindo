import type { SuppressionRecord, EntityId } from '../../types/domain.js'
import type { PaginationParams } from './IContactRepository.js'

export interface ISuppressionRepository {
  isSuppressed(phone: string): Promise<boolean>
  suppress(contactId: EntityId, reason: string): Promise<void>
  findAll(params: PaginationParams): Promise<{ data: SuppressionRecord[]; total: number }>
}
