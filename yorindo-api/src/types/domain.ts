/**
 * Domain Entity Types
 *
 * These types mirror the PostgreSQL schema (Story 1.2) and MongoDB collections.
 * Both in-memory repositories (Phase 1) and Postgres repositories (Phase 2) use these shapes.
 */

export type UUID = string
export type ISODateString = string

// ─── Lookup Types ─────────────────────────────────────────────────────────────

export interface Industry {
  id: UUID
  slug: string
  name: string
}

export interface JobTitle {
  id: UUID
  slug: string
  name: string
}

export interface Vendor {
  id: UUID
  name: string
  contact: string | null
  phone: string | null
  email: string | null
  createdAt: ISODateString
}

// ─── Contact ─────────────────────────────────────────────────────────────────

export type ConsentStatus = 'active' | 'suppressed' | 'legacy_unverified'
export type FlagCategory = 'spam' | 'not-potential' | null
export type CompanySize = '<50' | '50-200' | '200-1000' | '>1000'
export type ContactSource = 'excel_upload' | 'form' | 'manual'

export interface Contact {
  id: UUID
  name: string
  phone: string                    // normalized: +62XXXXXXXXXX
  email: string | null
  industryId: UUID | null
  jobTitleId: UUID | null
  city: string | null
  company: string | null
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
  id: UUID
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
  surveySchemaId: string | null     // MongoDB ObjectId as string
  vendorId: UUID | null
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
  eventId: UUID
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
  id: UUID
  contactId: UUID
  eventId: UUID
  status: RegistrationStatus
  ticketToken: string | null
  aiScore: number | null           // 0.000 to 1.000
  flagOverride: boolean
  approvedAt: ISODateString | null
  attendedAt: ISODateString | null
  createdAt: ISODateString
}

export interface ConfirmationStats {
  ticketsSent: number
  awaitingConfirmation: number
  waitlisted: number
}

export interface BlastHistoryEntry {
  id: UUID
  channel: 'email' | 'whatsapp'
  sentAt: ISODateString
  recipientCount: number
  status: 'completed' | 'partial' | 'failed'
}

// ─── User ────────────────────────────────────────────────────────────────────

export type UserRole = 'super_admin' | 'event_admin' | 'staff' | 'vendor_client' | 'participant'

export interface User {
  id: UUID
  email: string
  passwordHash: string
  role: UserRole
  name: string | null
  createdAt: ISODateString
  updatedAt: ISODateString
}

// ─── Flagged Record ──────────────────────────────────────────────────────────

export type FlaggedRecordStatus = 'pending' | 'resolved' | 'discarded'

export interface FlaggedRecord {
  id: UUID
  rawData: Record<string, unknown>
  flags: string[]
  status: FlaggedRecordStatus
  uploadId: string | null
  resolvedBy: UUID | null
  resolvedAt: ISODateString | null
  createdAt: ISODateString
}

// ─── Survey (MongoDB shape) ───────────────────────────────────────────────────

export interface SurveyField {
  key: string
  label: string
  type: 'text' | 'select' | 'radio' | 'checkbox' | 'number'
  required: boolean
  options?: string[]
}

export interface SurveySchema {
  id: string              // MongoDB ObjectId string
  eventId: UUID
  fields: SurveyField[]
  createdAt: ISODateString
  updatedAt: ISODateString
}

export interface SurveyResponse {
  id: string
  eventId: UUID
  registrationId: UUID
  answers: Record<string, unknown>
  submittedAt: ISODateString
}

// ─── Suppression ─────────────────────────────────────────────────────────────

export interface SuppressionRecord {
  id: UUID
  contactId: UUID
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

// ─── Raw Upload ──────────────────────────────────────────────────────────────

export interface RawUpload {
  id: UUID
  filename: string
  uploadedBy: UUID | null
  rowCount: number
  upsertedCount: number
  flaggedCount: number
  failedCount: number
  status: 'pending' | 'completed' | 'failed'
  createdAt: ISODateString
}

// ─── Audit Log ───────────────────────────────────────────────────────────────

export interface AuditLog {
  id: UUID
  action: string
  actorId: UUID | null
  actorRole: string
  eventId: UUID | null
  targetId: UUID | null
  targetType: string | null
  metadata: Record<string, unknown> | null
  createdAt: ISODateString
}
