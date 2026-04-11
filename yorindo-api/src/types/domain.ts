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
  phone: string | null                // normalized: +62XXXXXXXXXX or null if missing
  email: string | null
  serviceType: string | null
  jobTitle: string | null
  city: string | null
  provinceCode: string | null
  provinceName: string | null
  cityCode: string | null
  cityName: string | null
  company: string | null
  department: string | null
  eventDate: string | null
  topicTags: string[] | null          // interest-based tags for audience matching
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
  serviceTypes?: string[]
  cities?: string[]
  jobTitles?: string[]
  topicTags?: string[]
  behavior?: ('most_active' | 'low_attendance' | 'never_attended')[]
  lastAttendedBefore?: string
}

export interface Event {
  id: EntityId
  name: string
  slug: string
  startDate: ISODateString
  startTime: string
  endDate: ISODateString
  endTime: string
  timezone: string
  city: string | null
  venue: string | null
  description: string | null
  bannerUrl: string | null
  capacity: number | null
  waitlistBuffer: number
  approvalMode: ApprovalMode
  notificationChannel: NotificationChannel
  scanFormat: 'qr'
  targetCriteria: TargetCriteria | null
  surveySchemaId: string | null     // document-style survey schema id
  vendorId: EntityId | null
  status: EventStatus
  isPaid: boolean
  price: number | null
  paymentMethod: string | null
  postSurveyEnabled?: boolean      // Phase 2: dual survey toggle
  topicTags: string[] | null       // thematic content tags for audience matching
  deletedAt: ISODateString | null
  createdAt: ISODateString
  updatedAt: ISODateString
}

export interface EventOverviewMetrics {
  invited: number
  registered: number
  approved: number
  attended: number
  otsCount: number
  blastRegistered: number
  organicRegistered: number
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
  registrationSource?: 'blast' | 'organic' | 'ots' | null
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

export type SurveyFieldType =
  | 'text' | 'textarea' | 'radio' | 'select' | 'checkboxes'
  | 'range' | 'grid_radio' | 'grid_checkbox' | 'date' | 'time' | 'section'

export interface SurveyField {
  key: string
  label: string
  type: 'text' | 'select' | 'radio' | 'checkbox' | 'number' | SurveyFieldType
  required: boolean
  options?: string[]
  minimum?: number    // for range
  maximum?: number    // for range
  rows?: string[]     // for grid types
  columns?: string[]  // for grid types
  description?: string // for section
}

export type SurveyType = 'registration' | 'post-event'

export interface SurveySchema {
  id: string              // opaque survey schema id
  eventId: EntityId
  type?: SurveyType       // 'registration' | 'post-event' (Phase 2)
  fields: SurveyField[]
  schema?: Record<string, unknown>   // rjsf JSON Schema
  uiSchema?: Record<string, unknown> // rjsf UI Schema
  createdAt: ISODateString
  updatedAt: ISODateString
}

export interface SurveyResponse {
  id: string
  eventId: EntityId
  registrationId: EntityId
  surveyType?: SurveyType
  answers: Record<string, unknown>
  submittedAt: ISODateString
}

export interface SurveyResponseAggregate {
  questionId: string
  questionLabel: string
  fieldType: SurveyFieldType
  // For radio/select/checkboxes:
  optionCounts?: Array<{ label: string; count: number; percentage: number }>
  // For range/grid:
  average?: number
  distribution?: Array<{ label: string; count: number }>
  // For text/textarea:
  totalCount?: number
  samples?: string[]
}

export interface SurveyResponsesApiResponse {
  total: number
  aggregates: SurveyResponseAggregate[]
  responses: SurveyResponseRecord[]
  pagination: { page: number; pageSize: number; totalPages: number }
}

export interface SurveyResponseRecord {
  id: string
  registrationId: string
  contactName: string
  contactPhone: string
  submittedAt: string
  answers: Record<string, unknown>
}

// ─── Suppression ─────────────────────────────────────────────────────────────

export interface SuppressionRecord {
  id: EntityId
  contactId: EntityId
  phone: string | null
  email: string | null
  name: string | null
  reason: string
  createdAt: ISODateString
}

// ─── Facet Results (for filter UI) ───────────────────────────────────────────

export interface FacetResult {
  serviceType: Array<{ slug: string; label: string; count: number }>
  city: Array<{ slug: string; label: string; count: number }>
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

// ─── Template ────────────────────────────────────────────────────────────────

export type TemplateType = 'invitation' | 'confirmation' | 'rejection' | 'ticket_delivery' | 'cancellation' | 'reminder'
export type TemplateChannel = 'email' | 'whatsapp'

export interface Template {
  id: EntityId
  name: string
  type: TemplateType
  channel: TemplateChannel
  subject?: string
  body: string
  logoUrl?: string | null
  imageType?: 'header' | 'background' | null
  bgOpacity?: number | null
  createdAt: ISODateString
  updatedAt: ISODateString
}
