// FE-owned types — derived from openapi.yaml (Story 1.4).
// BE adopts these shapes when implementing; do NOT auto-generate from spec.

export type FlagCategory = 'spam' | 'not-potential' | 'invalid-data' | 'duplicate' | null

export interface Contact {
  id: string
  name: string
  phone: string
  email: string
  industryId: string
  jobTitleId: string
  city: string
  companySize: string
  completenessScore: number // 0.0–1.0, computed by GPT-4o in ETL (Story 3.3)
  flagCategory: FlagCategory // Manual flag set by admin (Story 3.4)
  createdAt: string
  updatedAt: string
}

export interface Event {
  id: string
  name: string
  slug: string
  description: string
  status: 'draft' | 'published' | 'active' | 'completed' | 'cancelled' | 'archived'
  eventDate: string // ISO 8601 UTC
  timezone: 'Asia/Jakarta' | 'Asia/Makassar' | 'Asia/Jayapura'
  capacity?: number
  bannerUrl?: string // Event banner image URL (Story 4.7)
  targetCriteria?: Record<string, unknown>
  surveySchema?: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface Registration {
  id: string
  contactId: string
  eventId: string
  status: 'pending' | 'confirmed' | 'approved' | 'rejected' | 'waitlisted' | 'attended' | 'cancelled'
  ticketToken: string | null
  surveyAnswers: Record<string, unknown>
  attendedAt: string | null
  createdAt: string
}

export interface User {
  id: string
  email: string
  name: string
  role: 'admin' | 'staff' | 'viewer'
  createdAt: string
  updatedAt: string
}

export interface ScanResult {
  status: 'success' | 'already_attended' | 'invalid'
  registration?: {
    id: string
    contactName: string
    eventName: string
  }
  attendedAt?: string | null
  message?: string
}

export interface YoriMindResult {
  analysis: string
  root_causes: string[]
  recommendations: Array<{
    action: string
    impact: string
    priority: 'high' | 'medium' | 'low'
  }>
  summary: string
  tracked_metrics: string[]
}

export interface ApiError {
  error: {
    code: string
    message: string
    details: Array<{ field: string; message: string }>
  }
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

export interface Industry {
  id: string
  slug: string
  name: string
}

export interface JobTitle {
  id: string
  slug: string
  name: string
}

// ─── Mutation Body Types ──────────────────────────────────────────────────────

export interface LoginBody {
  email: string
  password: string
}

export interface CreateEventBody {
  name: string
  description?: string
  eventDate: string
  timezone: Event['timezone']
  capacity?: number
  bannerUrl?: string
  blastTemplateId?: string
  confirmationTemplateId?: string
  rejectionTemplateId?: string
}

export interface UpdateRegistrationStatusBody {
  status: Registration['status']
}

export interface ScanVerifyBody {
  token: string
}

export interface CreateRegistrationBody {
  eventId: string
  name: string
  email: string
  phone: string
  surveyAnswers?: Record<string, unknown>
}

export interface CreateUserBody {
  email: string
  name: string
  role: User['role']
  password: string
}

export interface UpdateContactFlagBody {
  flagCategory: FlagCategory
}
