// Shared TypeScript types for emu-api
// Feature-specific types live in their domain files

export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}

export interface ApiError {
  error: {
    code: string
    message: string
    details: unknown[]
  }
}

export type EntityId = string

export interface AuditEntry {
  id: EntityId
  action: string
  actorId: EntityId | 'system'
  targetId: EntityId | null
  metadata: Record<string, unknown>
  createdAt: Date
}
