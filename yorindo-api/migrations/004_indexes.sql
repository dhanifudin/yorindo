-- Migration 004: Performance Indexes

CREATE INDEX IF NOT EXISTS idx_contacts_industry_id    ON contacts(industry_id);
CREATE INDEX IF NOT EXISTS idx_contacts_city           ON contacts(city);
CREATE INDEX IF NOT EXISTS idx_contacts_job_title_id   ON contacts(job_title_id);
CREATE INDEX IF NOT EXISTS idx_contacts_consent_status ON contacts(consent_status);

CREATE INDEX IF NOT EXISTS idx_registrations_event_id_status ON registrations(event_id, status);
CREATE INDEX IF NOT EXISTS idx_registrations_contact_id      ON registrations(contact_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id  ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_id  ON audit_logs(event_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target_id ON audit_logs(target_id);

CREATE INDEX IF NOT EXISTS idx_events_status ON events(status) WHERE deleted_at IS NULL;
