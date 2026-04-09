import { createId } from '@paralleldrive/cuid2'
import type { IUserRepository, UserEventAssignmentRecord } from '../../interfaces/repositories/IUserRepository.js'
import type { PaginationParams } from '../../interfaces/repositories/IContactRepository.js'
import type { User, UserRole } from '../../types/domain.js'
import { SEED_USER_IDS, SEED_EVENT_IDS, PASSWORD123_HASH } from './_seeds.js'

export class InMemoryUserRepository implements IUserRepository {
  private users: Map<string, User> = new Map()
  private userEvents: Map<string, Map<string, UserEventAssignmentRecord>> = new Map() // userId → eventId → metadata

  constructor() {
    this._seed()
  }

  private _seed(): void {
    const seedUsers: Array<{ role: UserRole; email: string; name: string }> = [
      { role: 'admin',  email: 'admin@yorindo.id',  name: 'Admin EM · U' },
      { role: 'staff',  email: 'staff@yorindo.id',  name: 'Staff EM · U' },
      { role: 'viewer', email: 'viewer@yorindo.id', name: 'Viewer EM · U' },
      { role: 'participant', email: 'participant@yorindo.id', name: 'Participant EM · U' },
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

    const seededAt = new Date('2026-01-01T00:00:00.000Z').toISOString()
    const seedAssignments = (userId: string, eventIds: string[]) => {
      const map = new Map<string, UserEventAssignmentRecord>()
      for (const eventId of eventIds) {
        map.set(eventId, { userId, eventId, grantedById: SEED_USER_IDS.admin, grantedAt: seededAt })
      }
      this.userEvents.set(userId, map)
    }

    // Assign staff to all published/active/completed events so scan tests work
    seedAssignments(SEED_USER_IDS.staff, [
      SEED_EVENT_IDS[2]!, SEED_EVENT_IDS[3]!,
      SEED_EVENT_IDS[4]!, SEED_EVENT_IDS[5]!,
      SEED_EVENT_IDS[6]!, SEED_EVENT_IDS[7]!,
    ])
    seedAssignments(SEED_USER_IDS.viewer, [SEED_EVENT_IDS[2]!])
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
    const existing = this.users.get(id)
    if (existing) {
      this.users.set(id, { ...existing, deletedAt: new Date().toISOString() })
    }
  }

  async assignEvent(userId: string, eventId: string, grantedById: string): Promise<UserEventAssignmentRecord> {
    if (!this.userEvents.has(userId)) {
      this.userEvents.set(userId, new Map())
    }
    const assignment: UserEventAssignmentRecord = {
      userId,
      eventId,
      grantedById,
      grantedAt: new Date().toISOString(),
    }
    this.userEvents.get(userId)!.set(eventId, assignment)
    return assignment
  }

  async getAssignedEvents(userId: string): Promise<string[]> {
    return Array.from(this.userEvents.get(userId)?.keys() ?? [])
  }

  async revokeEvent(userId: string, eventId: string): Promise<void> {
    this.userEvents.get(userId)?.delete(eventId)
  }
}
