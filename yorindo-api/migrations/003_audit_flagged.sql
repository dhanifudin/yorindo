-- Migration 003: Audit & Flagged Records

-- Flagged Records (from ETL)
CREATE TABLE IF NOT EXISTS flagged_records (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_data    JSONB NOT NULL,
  flags       JSONB NOT NULL,               -- array of flag reasons
  status      VARCHAR(20) DEFAULT 'pending', -- 'pending', 'resolved', 'discarded'
  upload_id   TEXT,                          -- MongoDB raw_upload _id reference
  resolved_by UUID REFERENCES users(id),
  resolved_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Audit Logs (INSERT only — never UPDATE or DELETE)
CREATE TABLE IF NOT EXISTS audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action      VARCHAR(100) NOT NULL,         -- '{resource}.{verb}'
  actor_id    UUID REFERENCES users(id),
  actor_role  VARCHAR(20) NOT NULL,
  event_id    UUID REFERENCES events(id),
  target_id   UUID,                          -- flexible target (contact, registration, etc.)
  target_type VARCHAR(50),
  metadata    JSONB,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Suppression / Consent records
CREATE TABLE IF NOT EXISTS consent_records (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id     UUID REFERENCES contacts(id) ON DELETE CASCADE,
  consent_status VARCHAR(30) NOT NULL,
  purpose        TEXT,
  recorded_at    TIMESTAMPTZ DEFAULT NOW()
);
