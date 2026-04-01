/**
 * Domain Entity Types
 *
 * These types mirror the PostgreSQL schema (Story 1.2) and document-style survey payloads.
 * Both in-memory repositories (Phase 1) and Postgres repositories (Phase 2) use these shapes.
 */

export type EntityId = string
export type ISODateString = string

// ─── Lookup Types ─────────────────────────────────────────────────────────────

export interface Industry {
  id: EntityId
  slug: string
  name: string
}

export interface JobTitle {
  id: EntityId
  slug: string
  name: string
}

export interface Vendor {
  id: EntityId
  name: string
  contactEmail: string
  industry: string
  logoUrl: string | null
  website: string | null
  notes: string | null
  createdAt: ISODateString
  updatedAt: ISODateString
}

export interface EventSponsor {
  id: EntityId
  eventId: EntityId
  vendorId: EntityId
  tier: 'premium' | 'standard' | 'supporter'
  displayOrder: number
  createdAt: ISODateString
}

// ─── Contact ─────────────────────────────────────────────────────────────────

export type ConsentStatus = 'active' | 'suppressed' | 'legacy_unverified'
export type FlagCategory = 'invalid-data' | 'duplicate' | null
export type CompanySize = '<50' | '50-200' | '200-1000' | '>1000'
export type ContactSource = 'excel_upload' | 'form' | 'manual'

export interface Contact {
  id: EntityId
  name: string
  phone: string                    // normalized: +62XXXXXXXXXX
  email: string | null
  industryId: EntityId | null
  jobTitleId: EntityId | null
  city: string | null
  company: string | null
  department?: string | null
  companySize: CompanySize | null
  source: ContactSource | null
  completenessScore: number        // 0.000 to 1.000
  consentStatus: ConsentStatus
  flagCategory: FlagCategory
  deletedAt: ISODateString | null
  createdAt: ISODateString
  updatedAt: ISODateString
}

// ─── Event ───────────────────────────────────────────────────────────────────

export type EventStatus = 'draft' | 'published' | 'active' | 'completed' | 'cancelled' | 'archived'
export type ApprovalMode = 'auto' | 'manual' | 'hybrid'
export type NotificationChannel = 'email' | 'whatsapp'

export interface TargetCriteria {
  industries?: string[]
  cities?: string[]
  companySizes?: string[]
  jobTitles?: string[]
}

export interface Event {
  id: EntityId
  name: string
  slug: string
  date: ISODateString
  timezone: string
  city: string | null
  venue: string | null
  description: string | null
  capacity: number | null
  waitlistBuffer: number
  approvalMode: ApprovalMode
  notificationChannel: NotificationChannel
  scanFormat: 'qr'
  targetCriteria: TargetCriteria | null
  surveySchemaId: string | null     // document-style survey schema id
  vendorId: EntityId | null
  status: EventStatus
  deletedAt: ISODateString | null
  createdAt: ISODateString
  updatedAt: ISODateString
}

export interface EventOverviewMetrics {
  invited: number
  registered: number
  approved: number
  attended: number
  conversionRate: number
}

export interface UpcomingUncontactedResult {
  eventId: EntityId
  eventName: string
  daysTillEvent: number
  uncontactedCount: number
}

// ─── Registration ────────────────────────────────────────────────────────────

export type RegistrationStatus =
  | 'pending'
  | 'confirmed'
  | 'approved'
  | 'rejected'
  | 'waitlisted'
  | 'attended'
  | 'cancelled'

export interface Registration {
  id: EntityId
  contactId: EntityId
  eventId: EntityId
  status: RegistrationStatus
  ticketToken: string | null
  aiScore: number | null           // 0.000 to 1.000
  flagOverride: boolean
  approvedAt: ISODateString | null
  attendedAt: ISODateString | null
  uploadSource?: 'etl_import' | 'onsite_import' | 'form'
  eventDate?: string | null
  eventNameRaw?: string | null
  createdAt: ISODateString
}

export interface ConfirmationStats {
  ticketsSent: number
  awaitingConfirmation: number
  waitlisted: number
}

export interface BlastHistoryEntry {
  id: EntityId
  channel: 'email' | 'whatsapp'
  sentAt: ISODateString
  recipientCount: number
  status: 'completed' | 'partial' | 'failed'
}

// ─── User ────────────────────────────────────────────────────────────────────

export type UserRole = 'admin' | 'viewer' | 'staff' | 'participant'

export interface User {
  id: EntityId
  email: string
  passwordHash: string
  role: UserRole
  name: string | null
  createdAt: ISODateString
  updatedAt: ISODateString
  deletedAt: ISODateString | null
}

// ─── Flagged Record ──────────────────────────────────────────────────────────

export type FlaggedRecordStatus = 'pending' | 'resolved' | 'discarded'

export interface FlaggedRecord {
  id: EntityId
  rawData: Record<string, unknown>
  flags: string[]
  status: FlaggedRecordStatus
  uploadId: string | null
  resolvedBy: EntityId | null
  resolvedAt: ISODateString | null
  createdAt: ISODateString
}

// ─── Survey (document-style shape) ─────────────────────────────────────────────

export interface SurveyField {
  key: string
  label: string
  type: 'text' | 'select' | 'radio' | 'checkbox' | 'number'
  required: boolean
  options?: string[]
}

export interface SurveySchema {
  id: string              // opaque survey schema id
  eventId: EntityId
  fields: SurveyField[]
  schema?: Record<string, unknown>
  uiSchema?: Record<string, unknown>
  createdAt: ISODateString
  updatedAt: ISODateString
}

export interface SurveyResponse {
  id: string
  eventId: EntityId
  registrationId: EntityId
  answers: Record<string, unknown>
  submittedAt: ISODateString
}

// ─── Suppression ─────────────────────────────────────────────────────────────

export interface SuppressionRecord {
  id: EntityId
  contactId: EntityId
  phone: string
  reason: string
  createdAt: ISODateString
}

// ─── Facet Results (for filter UI) ───────────────────────────────────────────

export interface FacetResult {
  industries: Array<{ id: string; name: string; count: number }>
  cities: Array<{ city: string; count: number }>
  companySizes: Array<{ size: string; count: number }>
}

export type DuplicateMatchReason = 'same_phone' | 'same_email' | 'similar_name'
export type DuplicateFieldChoice = 'primary' | 'duplicate'

export interface DuplicatePair {
  id: EntityId
  primary: Contact
  duplicate: Contact
  matchScore: number
  matchReasons: DuplicateMatchReason[]
}

// ─── Raw Upload ──────────────────────────────────────────────────────────────

export interface RawUpload {
  id: EntityId
  filename: string
  uploadedBy: EntityId | null
  rowCount: number
  upsertedCount: number
  flaggedCount: number
  failedCount: number
  status: 'pending' | 'completed' | 'failed'
  createdAt: ISODateString
}

// ─── Audit Log ───────────────────────────────────────────────────────────────

export interface AuditLog {
  id: EntityId
  action: string
  actorId: EntityId | null
  actorRole: string
  eventId: EntityId | null
  targetId: EntityId | null
  targetType: string | null
  metadata: Record<string, unknown> | null
  createdAt: ISODateString
}
