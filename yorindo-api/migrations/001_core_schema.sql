-- Migration 001: Core Schema

-- Industries lookup
CREATE TABLE IF NOT EXISTS industries (
  id    TEXT PRIMARY KEY,
  slug  VARCHAR(100) UNIQUE NOT NULL,
  name  VARCHAR(200) NOT NULL
);

-- Job Titles lookup
CREATE TABLE IF NOT EXISTS job_titles (
  id    TEXT PRIMARY KEY,
  slug  VARCHAR(100) UNIQUE NOT NULL,
  name  VARCHAR(200) NOT NULL
);

-- Vendors
CREATE TABLE IF NOT EXISTS vendors (
  id         TEXT PRIMARY KEY,
  name       VARCHAR(200) NOT NULL,
  contact    VARCHAR(200),
  phone      VARCHAR(20),
  email      VARCHAR(200),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contacts
CREATE TABLE IF NOT EXISTS contacts (
  id                 TEXT PRIMARY KEY,
  name               VARCHAR(200) NOT NULL,
  phone              VARCHAR(20) UNIQUE NOT NULL,  -- normalized: +62XXXXXXXXXX
  email              VARCHAR(200) UNIQUE,
  industry_id        TEXT REFERENCES industries(id),
  job_title_id       TEXT REFERENCES job_titles(id),
  city               VARCHAR(100),
  company            VARCHAR(200),
  company_size       VARCHAR(20),                  -- '<50', '50-200', '200-1000', '>1000'
  source             VARCHAR(50),                  -- 'excel_upload', 'form', 'manual'
  completeness_score NUMERIC(4,3) DEFAULT 0,       -- 0.000 to 1.000
  consent_status     VARCHAR(30) DEFAULT 'legacy_unverified', -- 'active', 'suppressed', 'legacy_unverified'
  flag_category      VARCHAR(50),                  -- 'spam', 'not-potential', null = clean
  deleted_at         TIMESTAMPTZ,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

-- Event status enum
DO $$ BEGIN
  CREATE TYPE event_status AS ENUM ('draft', 'published', 'active', 'completed', 'cancelled', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Events
CREATE TABLE IF NOT EXISTS events (
  id                   TEXT PRIMARY KEY,
  name                 VARCHAR(300) NOT NULL,
  slug                 VARCHAR(150) UNIQUE NOT NULL,
  date                 TIMESTAMPTZ NOT NULL,
  timezone             VARCHAR(50) DEFAULT 'Asia/Jakarta',
  city                 VARCHAR(100),
  venue                VARCHAR(300),
  description          TEXT,
  capacity             INTEGER,
  waitlist_buffer      INTEGER DEFAULT 0,
  approval_mode        VARCHAR(20) DEFAULT 'manual',   -- 'auto', 'manual', 'hybrid'
  notification_channel VARCHAR(20) DEFAULT 'email',    -- 'email', 'whatsapp'
  scan_format          VARCHAR(20) DEFAULT 'qr',       -- 'qr'
  target_criteria      JSONB,
  survey_schema_id     TEXT,
  vendor_id            TEXT REFERENCES vendors(id),
  status               event_status NOT NULL DEFAULT 'draft',
  deleted_at           TIMESTAMPTZ,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

-- Registration status enum
DO $$ BEGIN
  CREATE TYPE reg_status AS ENUM ('pending', 'confirmed', 'approved', 'rejected', 'waitlisted', 'attended', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Registrations
CREATE TABLE IF NOT EXISTS registrations (
  id            TEXT PRIMARY KEY,
  contact_id    TEXT REFERENCES contacts(id) ON DELETE CASCADE,
  event_id      TEXT REFERENCES events(id) ON DELETE CASCADE,
  status        reg_status NOT NULL DEFAULT 'pending',
  ticket_token  TEXT,
  ai_score      NUMERIC(4,3),
  flag_override BOOLEAN DEFAULT FALSE,
  approved_at   TIMESTAMPTZ,
  attended_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(contact_id, event_id)
);
