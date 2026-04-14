# EM · U — Database Schema Documentation

**Project:** EM · U Event Management Platform
**Updated:** 2026-04-13
**Database:** PostgreSQL 16
**Primary Keys:** TEXT (CUID2, application-generated)

---

## Entity Relationship Diagram

### Core Entities

```mermaid
erDiagram
    %% Lookup Tables
    industries {
        TEXT id PK
        VARCHAR slug UK
        VARCHAR name
    }

    job_titles {
        TEXT id PK
        VARCHAR slug UK
        VARCHAR name
    }

    cities {
        TEXT id PK
        VARCHAR province_code
        VARCHAR province_name
        VARCHAR city_code UK
        VARCHAR city_name
        JSONB aliases
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    %% Core Entities
    contacts {
        TEXT id PK
        VARCHAR name
        VARCHAR phone
        VARCHAR email
        TEXT industry_id FK
        TEXT job_title_id FK
        TEXT flag_category
        VARCHAR city
        TEXT city_code
        TEXT city_name
        TEXT province_code
        TEXT province_name
        VARCHAR company
        VARCHAR company_size
        TEXT service_type
        TEXT job_title
        TEXT department
        TEXT source
        TEXT topic_tags
        NUMERIC completeness_score
        VARCHAR consent_status
        TIMESTAMPTZ deleted_at
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    vendors {
        TEXT id PK
        VARCHAR name
        VARCHAR contact
        VARCHAR phone
        VARCHAR email
        TEXT contact_email
        TEXT industry
        TEXT logo_url
        TEXT website
        TEXT notes
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    events {
        TEXT id PK
        VARCHAR name
        VARCHAR slug UK
        TIMESTAMPTZ date
        VARCHAR timezone
        VARCHAR city
        VARCHAR venue
        TEXT description
        INTEGER capacity
        INTEGER waitlist_buffer
        VARCHAR approval_mode
        VARCHAR notification_channel
        VARCHAR scan_format
        JSONB target_criteria
        TEXT registration_survey_schema
        TEXT post_survey_schema
        BOOLEAN post_survey_enabled
        TEXT vendor_id FK
        VARCHAR status
        BOOLEAN is_paid
        NUMERIC price
        TEXT payment_method
        BOOLEAN registration_closed
        TEXT event_key
        TEXT banner_url
        TEXT topic_tags
        TEXT start_time
        TIMESTAMPTZ end_date
        TEXT end_time
        TIMESTAMPTZ deleted_at
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    registrations {
        TEXT id PK
        TEXT contact_id FK
        TEXT event_id FK
        VARCHAR status
        TEXT ticket_token
        NUMERIC ai_score
        BOOLEAN flag_override
        TIMESTAMPTZ approved_at
        TIMESTAMPTZ attended_at
        VARCHAR attendance_status
        VARCHAR check_in_method
        TEXT checked_in_by FK
        TEXT industry
        VARCHAR secondary_email
        VARCHAR title
        VARCHAR location
        TEXT upload_source
        TEXT event_date
        TEXT event_name_raw
        TEXT registration_source
        TIMESTAMPTZ created_at
    }

    %% Relationships
    industries ||--o{ contacts : "categorized by"
    job_titles ||--o{ contacts : "assigned to"
    vendors ||--o{ events : "organizes"
    events ||--o{ registrations : "has"
    contacts ||--o{ registrations : "registers for"
```

### Users & Access

```mermaid
erDiagram
    users {
        TEXT id PK
        VARCHAR email UK
        VARCHAR password_hash
        VARCHAR role
        VARCHAR name
        TIMESTAMPTZ deleted_at
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    user_events {
        TEXT id PK
        TEXT user_id FK
        TEXT event_id FK
        TEXT granted_by FK
        TIMESTAMPTZ granted_at
    }

    events ||--o{ user_events : "assigned to"
    users ||--o{ user_events : "access to"
    users ||--o{ user_events : "granted by"
```

### Survey System

```mermaid
erDiagram
    survey_templates {
        TEXT id PK
        VARCHAR name
        TEXT description
        VARCHAR survey_type
        JSONB schema
        JSONB ui_schema
        BOOLEAN is_builtin
        TEXT created_by
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    survey_responses {
        TEXT id PK
        TEXT event_id FK
        TEXT registration_id FK
        VARCHAR survey_type
        JSONB answers
        TIMESTAMPTZ submitted_at
        TIMESTAMPTZ created_at
    }

    events ||--o{ survey_responses : "collects"
    registrations ||--o{ survey_responses : "submits"
    survey_templates ||..o{ events : "templates"
```

### Communication & Templates

```mermaid
erDiagram
    templates {
        TEXT id PK
        VARCHAR name
        VARCHAR type
        VARCHAR channel
        VARCHAR subject
        TEXT body
        JSONB variables
        TEXT logo_url
        VARCHAR image_type
        NUMERIC bg_opacity
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    blast_logs {
        TEXT id PK
        TEXT event_id FK
        TEXT template_id
        VARCHAR channel
        INTEGER recipient_count
        VARCHAR status
        TIMESTAMPTZ sent_at
        TIMESTAMPTZ created_at
    }

    blast_log_recipients {
        TEXT id PK
        TEXT blast_log_id FK
        TEXT contact_id FK
        TEXT event_id FK
        VARCHAR channel
        TIMESTAMPTZ sent_at
    }

    events ||--o{ blast_logs : "sends"
    blast_logs ||--o{ blast_log_recipients : "tracks"
    contacts ||--o{ blast_log_recipients : "receives"
    templates ||..o{ blast_logs : "uses"
```

### Audit & Compliance

```mermaid
erDiagram
    flagged_records {
        TEXT id PK
        JSONB raw_data
        JSONB flags
        VARCHAR status
        TEXT upload_id
        TEXT resolved_by FK
        TIMESTAMPTZ resolved_at
        TIMESTAMPTZ created_at
    }

    audit_logs {
        TEXT id PK
        VARCHAR action
        TEXT actor_id
        VARCHAR actor_role
        TEXT event_id
        TEXT target_id
        VARCHAR target_type
        JSONB metadata
        TIMESTAMPTZ created_at
    }

    raw_uploads {
        TEXT id PK
        TEXT filename
        TEXT uploaded_by
        INTEGER row_count
        INTEGER upserted_count
        INTEGER flagged_count
        INTEGER failed_count
        VARCHAR status
        TIMESTAMPTZ created_at
    }

    duplicate_pairs {
        TEXT id PK
        TEXT primary_id
        TEXT duplicate_id
        NUMERIC match_score
        JSONB match_reasons
        TIMESTAMPTZ resolved_at
    }

    consent_records {
        TEXT id PK
        TEXT contact_id FK
        VARCHAR consent_status
        TEXT purpose
        TEXT phone
        TEXT email
        TEXT name
        TEXT reason
        TIMESTAMPTZ recorded_at
    }

    raw_uploads ||--o{ flagged_records : "generates"
    users ||--o{ flagged_records : "resolves"
    contacts ||--o{ consent_records : "has"
    contacts ||..o{ duplicate_pairs : "may duplicate"
    users ||..o{ audit_logs : "performs"
    events ||..o{ audit_logs : "relates to"
```

### Settings & Sponsors

```mermaid
erDiagram
    settings {
        TEXT id PK
        VARCHAR key UK
        TEXT value
        VARCHAR category
        TEXT description
        BOOLEAN is_secret
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    event_sponsors {
        TEXT id PK
        TEXT event_id FK
        TEXT vendor_id FK
        VARCHAR tier
        INTEGER display_order
        TIMESTAMPTZ created_at
    }

    events ||--o{ event_sponsors : "has"
    vendors ||--o{ event_sponsors : "sponsors"
```

---

## Complete Table Reference

### Lookup Tables (3)

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| **industries** | Standard industry list | `id`, `slug`, `name` |
| **job_titles** | Standard job title list | `id`, `slug`, `name` |
| **cities** | Indonesian wilayah data | `id`, `province_code`, `city_code`, `city_name` |

### Core Entity Tables (5)

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| **contacts** | Contact database | `id`, `name`, `phone`, `email`, `flag_category`, `industry_id`, `job_title_id` |
| **events** | Event management | `id`, `name`, `slug`, `status`, `date`, `capacity`, `vendor_id` |
| **registrations** | Event registrations | `id`, `contact_id`, `event_id`, `status`, `ticket_token`, `attendance_status` |
| **vendors** | Vendor management | `id`, `name`, `contact`, `email`, `phone` |
| **users** | System users | `id`, `email`, `password_hash`, `role`, `name` |

### Access Control (1)

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| **user_events** | Staff event assignments | `user_id`, `event_id`, `granted_by`, `granted_at` |

### Survey System (2)

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| **survey_templates** | Reusable survey schemas | `id`, `name`, `survey_type`, `schema`, `is_builtin` |
| **survey_responses** | Submitted survey answers | `event_id`, `registration_id`, `survey_type`, `answers` |

### Communication (3)

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| **templates** | Email/WhatsApp templates | `id`, `name`, `type`, `channel`, `subject`, `body` |
| **blast_logs** | Blast send history | `event_id`, `template_id`, `channel`, `recipient_count`, `status` |
| **blast_log_recipients** | Individual blast recipients | `blast_log_id`, `contact_id`, `event_id`, `channel` |

### Audit & Compliance (5)

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| **flagged_records** | Data quality review queue | `raw_data`, `flags`, `status`, `upload_id`, `resolved_by` |
| **audit_logs** | System activity log | `action`, `actor_id`, `actor_role`, `target_id`, `metadata` |
| **raw_uploads** | ETL import tracking | `filename`, `row_count`, `upserted_count`, `flagged_count`, `status` |
| **duplicate_pairs** | Duplicate contact pairs | `primary_id`, `duplicate_id`, `match_score`, `match_reasons` |
| **consent_records** | PDP compliance tracking | `contact_id`, `consent_status`, `purpose`, `reason` |

### Settings & Sponsors (2)

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| **settings** | Application configuration | `key`, `value`, `category`, `is_secret` |
| **event_sponsors** | Event sponsor assignments | `event_id`, `vendor_id`, `tier`, `display_order` |

---

## Enum Values

### `event_status`

| Value | Description |
|-------|-------------|
| `draft` | Event being prepared |
| `published` | Event published, registration open |
| `active` | Event is live, check-in enabled |
| `completed` | Event finished |
| `cancelled` | Event cancelled |
| `archived` | Event archived |

### `reg_status`

| Value | Description |
|-------|-------------|
| `pending` | Awaiting admin approval |
| `confirmed` | Registration confirmed |
| `approved` | Approved by admin |
| `rejected` | Rejected by admin |
| `waitlisted` | On waitlist |
| `attended` | Checked in at event |
| `cancelled` | Registration cancelled |
| `provisional` | Walk-in / OTS registration |

### `flag_category` (contacts)

| Value | Description |
|-------|-------------|
| `invalid-data` | Missing or invalid required fields |
| `duplicate` | Potential duplicate contact |
| `industry-unmatched` | Service type doesn't match standard |
| `jobtitle-unmatched` | Job title doesn't match standard |
| `spam` | Spam contact |
| `not-potential` | Not a potential attendee |
| `NULL` | Clean contact |

---

## Key Indexes

| Table | Index | Columns | Purpose |
|-------|-------|---------|---------|
| contacts | `idx_contacts_industry_id` | `industry_id` | Industry filtering |
| contacts | `idx_contacts_consent_status` | `consent_status` | Compliance queries |
| contacts | `idx_contacts_province_code` | `province_code` | Province filtering |
| events | `idx_events_status` | `status` (partial) | Active event queries |
| registrations | `idx_registrations_event_id_status` | `(event_id, status)` | Event registration status |
| registrations | `idx_registrations_attendance_status` | `attendance_status` | Attendance stats |
| blast_logs | `idx_blast_logs_event_id` | `event_id` | Event blast history |
| blast_log_recipients | `idx_blast_log_recipients_contact_event` | `(contact_id, event_id)` | Recipient tracking |
| survey_responses | `idx_survey_responses_event_type` | `(event_id, survey_type)` | Survey analytics |

---

## Data Flow

```
Upload .xlsx → raw_uploads → contacts (+ flagged_records if issues)
                                                      ↓
events ← blast_logs ← blast_log_recipients ← contacts
  ↓                        ↓
registrations ← survey_responses
  ↓
users (check-in)
```
