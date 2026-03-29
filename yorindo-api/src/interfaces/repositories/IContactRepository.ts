import type { Contact, DuplicateFieldChoice, DuplicatePair, FacetResult, EntityId } from '../../types/domain.js'

export interface PaginationParams {
  page: number
  pageSize: number
  sortBy?: string
  sortDir?: 'asc' | 'desc'
}

export interface ContactFilters {
  industry?: string
  city?: string
  companySize?: string
  missingEmail?: boolean
  missingPhone?: boolean
  flagCategory?: string
  consentStatus?: string
  search?: string
}

export interface IContactRepository {
  findAll(params: PaginationParams, filters?: ContactFilters): Promise<{ data: Contact[]; total: number }>
  findById(id: EntityId): Promise<Contact | null>
  findByPhone(phone: string): Promise<Contact | null>
  findDuplicates(params: PaginationParams): Promise<{ data: DuplicatePair[]; total: number }>
  mergeDuplicate(primaryId: EntityId, fieldSelections?: Record<string, DuplicateFieldChoice>): Promise<Contact | null>
  upsert(data: Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>): Promise<Contact>
  update(id: EntityId, data: Partial<Contact>): Promise<Contact | null>
  softDelete(id: EntityId): Promise<void>
  countHealth(): Promise<{ flagged: number; duplicates: number; missingEmail: number; missingPhone: number }>
  findFacets(): Promise<FacetResult>
  anonymize(id: EntityId, hashedPhone: string): Promise<void>
  existsByPhoneHash(hashedPhone: string): Promise<boolean>
}
