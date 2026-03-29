import type { User, EntityId } from '../../types/domain.js'
import type { PaginationParams } from './IContactRepository.js'

export interface UserEventAssignmentRecord {
  userId: EntityId
  eventId: EntityId
  grantedById: EntityId
  grantedAt: string
}

export interface IUserRepository {
  findAll(params: PaginationParams): Promise<{ data: User[]; total: number }>
  findById(id: EntityId): Promise<User | null>
  findByIdIncludingDeleted(id: EntityId): Promise<User | null>
  findByEmail(email: string): Promise<User | null>
  create(data: Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>): Promise<User>
  update(id: EntityId, data: Partial<User>): Promise<User | null>
  delete(id: EntityId): Promise<void>
  assignEvent(userId: EntityId, eventId: EntityId, grantedById: EntityId): Promise<UserEventAssignmentRecord>
  getAssignedEvents(userId: EntityId): Promise<EntityId[]>
  revokeEvent(userId: EntityId, eventId: EntityId): Promise<void>
}
