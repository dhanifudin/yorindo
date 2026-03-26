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
  venue?: string            // e.g. 'Jakarta Convention Center'
  industryTags?: string[]   // e.g. ['teknologi', 'keuangan']
  eventType?: 'conference' | 'workshop' | 'networking' | 'seminar' | 'webinar'
  topicTags?: string[]      // e.g. ['fintech', 'digital-banking']
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

export interface RegistrationWithContact extends Registration {
  contactName: string
  contactEmail: string
  contactPhone: string
  contactFlagCategory: FlagCategory
  aiScore: number      // 0–99 (djb2 % 100)
  flagOverride: boolean
}

export interface User {
  id: string
  email: string
  name: string
  role: 'admin' | 'staff' | 'viewer' | 'participant'
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

// EventReport type — contract between Story 4.12 (stub) and Epic 8 (full implementation)
export interface EventReport {
  eventId: string
  funnelMetrics: {
    blast: number
    registrations: number
    approved: number
    attended: number
  }
  demographics: {
    byIndustry: Array<{ industry: string; count: number }>
    byCity: Array<{ city: string; count: number }>
  }
  generatedAt: string
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
  venue?: string
  industryTags?: string[]
  eventType?: Event['eventType']
  topicTags?: string[]
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

// ─── AI Audience Recommendations ─────────────────────────────────────────────

export interface AudienceRecommendation {
  contactId: string
  name: string
  email: string
  phone: string
  industryId: string // matches Contact.industryId (normalized ID, not display string)
  city: string
  companySize: string
  score: number // 0–100
  factors: string[] // e.g. ['industry:teknologi', 'attended:similar-event', 'location:jakarta']
  reliabilityRate?: number // 0.0–1.0 (checked_in / registered ratio)
}

export interface AudienceRecommendationsResponse {
  recommendations: AudienceRecommendation[]
  totalMatched: number
  totalExcluded: number
  excludedReasons: Record<string, number> // e.g. { 'not-potential': 5, 'spam': 3 }
}

export interface RecommendedEvent {
  eventId: string // NOTE: field is eventId, not id — use event.eventId for link construction
  name: string
  eventDate: string
  status: string
  score: number // 0–100
  factors: string[]
}

export interface RecommendedEventsResponse {
  recommendations: RecommendedEvent[]
  totalMatched: number
}

export interface BlastPayload {
  filters?: { industry?: string; city?: string; companySize?: string }
  contactIds?: string[] // AI-curated list from sessionStorage
  templateId: string
  channel: 'whatsapp' | 'email'
  scheduledAt?: string // ISO 8601 UTC; must be >= now + 5 minutes if provided
}

export interface BlastResponse {
  jobId: string
  status: 'queued' | 'scheduled'
  scheduledAt?: string
  recipientCount?: number
}

export interface BlastPrefilledAudience {
  eventId: string
  contactIds: string[]
  count: number
}

export interface EmergencyBlastBody {
  message: string
  channel: 'whatsapp' | 'email'
}

export interface EmergencyBlastResponse {
  jobId: string
  recipientCount: number
  status: 'queued'
}

// ─── Contacts Health & Facets ─────────────────────────────────────────────────

export interface ContactsHealth {
  flagged: number
  duplicates: number
  missingEmail: number
}

export interface FacetItem {
  slug: string
  label: string
  count: number
}

export interface ContactsFacets {
  industry: FacetItem[]
  city: FacetItem[]
  companySize: FacetItem[]
}

// ─── Contact History ──────────────────────────────────────────────────────────

export interface ContactHistoryItem {
  eventId: string
  eventName: string
  eventDate: string
  status: 'pending' | 'confirmed' | 'approved' | 'attended' | 'cancelled' | 'rejected' | 'waitlisted'
}

export interface ContactHistoryResponse {
  registrations: ContactHistoryItem[]
}

// ─── Event Banner ─────────────────────────────────────────────────────────────

export interface UpcomingUncontactedEvent {
  event: { id: string; name: string; eventDate: string; industryTags?: string[] } | null
  daysUntil?: number
  uncontactedCount?: number
}

// ─── Vendor / Sponsorship ─────────────────────────────────────────────────────

export interface Vendor {
  id: string
  name: string
  logo_url?: string
  website?: string
  contact_email: string
  industry?: string
  notes?: string
  linked_event_count: number
  created_at: string
  updated_at: string
}

export interface CreateVendorBody {
  name: string
  contact_email: string
  website?: string
  logo_url?: string
  industry?: string
  notes?: string
}

export interface EventSponsor {
  id: string
  event_id: string
  vendor_id: string
  vendor_name: string
  tier: 'standard' | 'premium' | 'lead_intelligence'
  display_order: number
}

export interface AttachSponsorBody {
  vendorId: string
  tier: EventSponsor['tier']
  displayOrder?: number
}

export interface PublicEventSponsor {
  vendor_id: string
  name: string
  logo_url?: string
  website?: string
  tier: EventSponsor['tier']
  display_order: number
}
