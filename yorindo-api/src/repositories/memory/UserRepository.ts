import type { IUserRepository } from '../../interfaces/repositories/IUserRepository.js'
import type { PaginationParams } from '../../interfaces/repositories/IContactRepository.js'
import type { User } from '../../types/domain.js'

export class InMemoryUserRepository implements IUserRepository {
  private users: Map<string, User> = new Map()
  private userEvents: Map<string, Set<string>> = new Map() // userId → Set<eventId>

  constructor() {
    this._seed()
  }

  private _seed(): void {
    const admin: User = {
      id: crypto.randomUUID(),
      email: 'admin@yorindo.id',
      passwordHash: '$2b$10$placeholderhashforadmin',
      role: 'event_admin',
      name: 'Admin Yorindo',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    const staff: User = {
      id: crypto.randomUUID(),
      email: 'staff@yorindo.id',
      passwordHash: '$2b$10$placeholderhashforstaff',
      role: 'staff',
      name: 'Staff Yorindo',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    this.users.set(admin.id, admin)
    this.users.set(staff.id, staff)
  }

  async findAll(params: PaginationParams): Promise<{ data: User[]; total: number }> {
    const data = Array.from(this.users.values())
    const total = data.length
    const start = (params.page - 1) * params.pageSize
    return { data: data.slice(start, start + params.pageSize), total }
  }

  async findById(id: string): Promise<User | null> {
    return this.users.get(id) ?? null
  }

  async findByEmail(email: string): Promise<User | null> {
    return Array.from(this.users.values()).find(u => u.email === email) ?? null
  }

  async create(data: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const user: User = {
      id: crypto.randomUUID(),
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    this.users.set(user.id, user)
    return user
  }

  async update(id: string, data: Partial<User>): Promise<User | null> {
    const existing = this.users.get(id)
    if (!existing) return null
    const updated: User = { ...existing, ...data, id, updatedAt: new Date().toISOString() }
    this.users.set(id, updated)
    return updated
  }

  async delete(id: string): Promise<void> {
    this.users.delete(id)
    this.userEvents.delete(id)
  }

  async assignEvent(userId: string, eventId: string, _grantedById: string): Promise<void> {
    if (!this.userEvents.has(userId)) {
      this.userEvents.set(userId, new Set())
    }
    this.userEvents.get(userId)!.add(eventId)
  }

  async getAssignedEvents(userId: string): Promise<string[]> {
    return Array.from(this.userEvents.get(userId) ?? [])
  }
}
