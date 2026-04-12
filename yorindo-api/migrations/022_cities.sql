-- ─────────────────────────────────────────────
-- Migration 022: Cities/Wilayah Table
-- Stores Indonesian province/city data for contacts and registration
-- Applied via: npx tsx scripts/migrate.ts
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS cities (
  id            TEXT PRIMARY KEY,
  province_code VARCHAR(10) NOT NULL,
  province_name VARCHAR(100) NOT NULL,
  city_code     VARCHAR(20) NOT NULL UNIQUE,
  city_name     VARCHAR(100) NOT NULL,
  aliases       JSONB DEFAULT '[]',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for filtering by province
CREATE INDEX IF NOT EXISTS idx_cities_province ON cities(province_code);

-- Index for searching by city name
CREATE INDEX IF NOT EXISTS idx_cities_city_name ON cities(city_name);
