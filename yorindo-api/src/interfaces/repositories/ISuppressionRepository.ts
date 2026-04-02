import type { SuppressionRecord, EntityId } from '../../types/domain.js'
import type { PaginationParams } from './IContactRepository.js'

export interface SuppressionLookup {
  phone?: string | null
  email?: string | null
}

export interface SuppressionCreateOptions {
  phone?: string | null
  email?: string | null
  name?: string | null
}

export interface ISuppressionRepository {
  isSuppressed(input: string | SuppressionLookup): Promise<boolean>
  suppress(contactId: EntityId, reason: string, options?: SuppressionCreateOptions): Promise<SuppressionRecord>
  remove(id: EntityId): Promise<boolean>
  findAll(params: PaginationParams): Promise<{ data: SuppressionRecord[]; total: number }>
}
