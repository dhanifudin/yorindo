// Shared TypeScript types for yorindo-api
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

export type UUID = string

export interface AuditEntry {
  id: UUID
  action: string
  actorId: UUID | 'system'
  targetId: UUID | null
  metadata: Record<string, unknown>
  createdAt: Date
}
