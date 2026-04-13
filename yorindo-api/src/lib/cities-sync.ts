/**
 * Syncs the `cities` table from the official Indonesian wilayah data source.
 * Extracted from cities.routes.ts so it can be called both on startup and via API.
 */
import { getPool } from '../lib/postgres.js'
import { createId } from '@paralleldrive/cuid2'

const BASE_URL = 'https://raw.githubusercontent.com/emsifa/api-wilayah-indonesia/master/static/api'

async function fetchProvinces(): Promise<Array<{ code: string; name: string }>> {
  const res = await fetch(`${BASE_URL}/provinces.json`, {
    headers: { 'Accept': 'application/json' },
    signal: AbortSignal.timeout(15_000),
  })
  if (!res.ok) throw new Error(`Failed to fetch provinces: ${res.status}`)
  const data = await res.json()
  return data.map((p: { id: string; name: string }) => ({ code: p.id, name: p.name }))
}

async function fetchAllRegencies(): Promise<Array<{
  province_code: string
  province_name: string
  city_code: string
  city_name: string
}>> {
  const provinces = await fetchProvinces()
  const allRegencies: Array<{ province_code: string; province_name: string; city_code: string; city_name: string }> = []

  for (const prov of provinces) {
    try {
      const res = await fetch(`${BASE_URL}/regencies/${prov.code}.json`, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(15_000),
      })
      if (!res.ok) continue

      const data = await res.json()
      const items = Array.isArray(data) ? data : []

      for (const item of items) {
        allRegencies.push({
          province_code: prov.code,
          province_name: prov.name,
          city_code: item.id,
          city_name: item.name,
        })
      }
    } catch {
      // Skip province if fetch fails
      continue
    }
  }

  return allRegencies
}

export interface CitiesSyncResult {
  inserted: number
  updated: number
  total: number
}

/**
 * Fetch the latest wilayah data and upsert into the `cities` table.
 * Non-blocking: designed to be called in the background on startup.
 */
export async function syncCities(): Promise<CitiesSyncResult> {
  const regencies = await fetchAllRegencies()
  const pool = getPool()
  let inserted = 0
  let updated = 0

  for (const item of regencies) {
    const result = await pool.query(
      `INSERT INTO cities (id, province_code, province_name, city_code, city_name, aliases)
       VALUES ($1, $2, $3, $4, $5, '[]')
       ON CONFLICT (city_code) DO UPDATE SET
         province_code = EXCLUDED.province_code,
         province_name = EXCLUDED.province_name,
         city_name = EXCLUDED.city_name,
         updated_at = NOW()
       RETURNING (xmax = 0) AS inserted`,
      [createId(), item.province_code, item.province_name, item.city_code, item.city_name],
    )

    if (result.rows[0]?.inserted) {
      inserted++
    } else {
      updated++
    }
  }

  return { inserted, updated, total: regencies.length }
}
