import { createId } from '@paralleldrive/cuid2'
import type { IUserRepository } from '../../interfaces/repositories/IUserRepository.js'
import type { PaginationParams } from '../../interfaces/repositories/IContactRepository.js'
import type { User, UserRole } from '../../types/domain.js'
import { SEED_USER_IDS, PASSWORD123_HASH } from './_seeds.js'

export class InMemoryUserRepository implements IUserRepository {
  private users: Map<string, User> = new Map()
  private userEvents: Map<string, Set<string>> = new Map() // userId → Set<eventId>

  constructor() {
    this._seed()
  }

  private _seed(): void {
    const seedUsers: Array<{ role: UserRole; email: string; name: string }> = [
      { role: 'admin',  email: 'admin@yorindo.id',  name: 'Admin Yorindo' },
      { role: 'staff',  email: 'staff@yorindo.id',  name: 'Staff Yorindo' },
      { role: 'viewer', email: 'viewer@yorindo.id', name: 'Viewer Yorindo' },
    ]

    for (const { role, email, name } of seedUsers) {
      const user: User = {
        id: SEED_USER_IDS[role],
        email,
        passwordHash: PASSWORD123_HASH,
        role,
        name,
        createdAt: new Date('2026-01-01T00:00:00.000Z').toISOString(),
        updatedAt: new Date('2026-01-01T00:00:00.000Z').toISOString(),
      }
      this.users.set(user.id, user)
    }
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
      id: createId(),
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
