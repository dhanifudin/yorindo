import type { User, UUID } from '../../types/domain.js'
import type { PaginationParams } from './IContactRepository.js'

export interface IUserRepository {
  findAll(params: PaginationParams): Promise<{ data: User[]; total: number }>
  findById(id: UUID): Promise<User | null>
  findByEmail(email: string): Promise<User | null>
  create(data: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User>
  update(id: UUID, data: Partial<User>): Promise<User | null>
  delete(id: UUID): Promise<void>
  assignEvent(userId: UUID, eventId: UUID, grantedById: UUID): Promise<void>
  getAssignedEvents(userId: UUID): Promise<UUID[]>
}
