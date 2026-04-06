-- Migration 002: Users & Access

-- Users
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  email         VARCHAR(200) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(20) NOT NULL,  -- 'super_admin', 'event_admin', 'staff', 'vendor_client', 'participant'
  name          VARCHAR(200),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- User-Event access assignments (staff/viewer event scoping)
CREATE TABLE IF NOT EXISTS user_events (
  id         TEXT PRIMARY KEY,
  user_id    TEXT REFERENCES users(id) ON DELETE CASCADE,
  event_id   TEXT REFERENCES events(id) ON DELETE CASCADE,
  granted_by TEXT REFERENCES users(id),
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, event_id)
);
