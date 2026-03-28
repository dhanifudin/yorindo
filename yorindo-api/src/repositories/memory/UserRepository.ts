import { createId } from '@paralleldrive/cuid2'
import type { IUserRepository } from '../../interfaces/repositories/IUserRepository.js'
import type { PaginationParams } from '../../interfaces/repositories/IContactRepository.js'
import type { User, UserRole } from '../../types/domain.js'
import { SEED_USER_IDS, SEED_EVENT_IDS, PASSWORD123_HASH } from './_seeds.js'

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
      { role: 'participant', email: 'participant@yorindo.id', name: 'Participant Yorindo' },
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
        deletedAt: null,
      }
      this.users.set(user.id, user)
    }

    // Assign staff to all published/active/completed events so scan tests work
    this.userEvents.set(SEED_USER_IDS.staff, new Set([
      SEED_EVENT_IDS[2]!, SEED_EVENT_IDS[3]!,
      SEED_EVENT_IDS[4]!, SEED_EVENT_IDS[5]!,
      SEED_EVENT_IDS[6]!, SEED_EVENT_IDS[7]!,
    ]))
    this.userEvents.set(SEED_USER_IDS.viewer, new Set([SEED_EVENT_IDS[2]!]))
  }

  async findAll(params: PaginationParams): Promise<{ data: User[]; total: number }> {
    const data = Array.from(this.users.values()).filter((user) => user.deletedAt === null)
    const total = data.length
    const safePage = Math.max(1, params.page)
    const start = (safePage - 1) * params.pageSize
    return { data: data.slice(start, start + params.pageSize), total }
  }

  async findById(id: string): Promise<User | null> {
    const user = this.users.get(id) ?? null
    return user?.deletedAt ? null : user
  }

  async findByIdIncludingDeleted(id: string): Promise<User | null> {
    return this.users.get(id) ?? null
  }

  async findByEmail(email: string): Promise<User | null> {
    return Array.from(this.users.values()).find(u => u.email === email && u.deletedAt === null) ?? null
  }

  async create(data: Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>): Promise<User> {
    const user: User = {
      id: createId(),
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
    }
    this.users.set(user.id, user)
    return user
  }

  async update(id: string, data: Partial<User>): Promise<User | null> {
    const existing = this.users.get(id)
    if (!existing || existing.deletedAt) return null
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

  async revokeEvent(userId: string, eventId: string): Promise<void> {
    this.userEvents.get(userId)?.delete(eventId)
  }
}
