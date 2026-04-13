/**
 * CityIndex — loads Indonesian wilayah (province/city) data from the
 * `cities` database table and provides fast lookup with generated aliases.
 *
 * Aliases are derived automatically from city names by stripping common
 * prefixes (Kota, Kabupaten, Kab., Kot.) and keeping the core name.
 * Falls back to static JSON when the database is unavailable (e.g., tests).
 */

import { getPool } from '../../../lib/postgres.js'
import WILAYAH_RAW from '../../../data/wilayah-static.json' with { type: 'json' }

interface WilayahEntry {
  provinceCode: string
  provinceName: string
  cityCode: string
  cityName: string
  aliases: string[]
}

const STATIC_WILAYAH = WILAYAH_RAW as WilayahEntry[]

interface CityEntry {
  provinceCode: string
  provinceName: string
  cityCode: string
  cityName: string
  /** Lowercased aliases generated from the city name */
  aliases: string[]
}

interface CityMatch {
  provinceCode: string
  provinceName: string
  cityCode: string
  cityName: string
}

/** Keywords that commonly appear before a core city name */
const PREFIX_RE = /^(kota|kabupaten|kab\.?|kot\.?)\s+/i

/** Common Indonesian city abbreviations / nicknames that fuzzy matching may miss */
const KEYWORD_ABBREVIATIONS: Record<string, string> = {
  jkt: 'Jakarta Pusat',
  jakarta: 'Jakarta Pusat',
  dki: 'Jakarta Pusat',
  'jakarta pusat': 'Jakarta Pusat',
  'jakarta barat': 'Jakarta Barat',
  'jakarta selatan': 'Jakarta Selatan',
  'jakarta timur': 'Jakarta Timur',
  'jakarta utara': 'Jakarta Utara',
  sby: 'Kota Surabaya',
  surabaya: 'Kota Surabaya',
  bdg: 'Kota Bandung',
  bandung: 'Kota Bandung',
  smg: 'Kota Semarang',
  semarang: 'Kota Semarang',
  jogja: 'Kota Yogyakarta',
  yogyakarta: 'Kota Yogyakarta',
  jogya: 'Kota Yogyakarta',
  makassar: 'Kota Makassar',
  upandang: 'Kota Makassar', // Ujung Pandang (old name)
  palembang: 'Kota Palembang',
  balikpapan: 'Kota Balikpapan',
  denpasar: 'Kota Denpasar',
  bali: 'Kota Denpasar',
  medan: 'Kota Medan',
  batam: 'Kota Batam',
  pekanbaru: 'Kota Pekanbaru',
  peku: 'Kota Pekanbaru',
  manado: 'Kota Manado',
  padang: 'Kota Padang',
  bandar: 'Kota Bandar Lampung',
  'bandar lampung': 'Kota Bandar Lampung',
  lampung: 'Kota Bandar Lampung',
  pontianak: 'Kota Pontianak',
  banjarmasin: 'Kota Banjarmasin',
  palu: 'Kota Palu',
  kendari: 'Kota Kendari',
  gorontalo: 'Kota Gorontalo',
  mataram: 'Kota Mataram',
  kupang: 'Kota Kupang',
  jambi: 'Kota Jambi',
  bengkulu: 'Kota Bengkulu',
  cirebon: 'Kota Cirebon',
  sukabumi: 'Kota Sukabumi',
  bogor: 'Kota Bogor',
  depok: 'Kota Depok',
  bekasi: 'Kota Bekasi',
  tangerang: 'Kota Tangerang',
  'tangerang selatan': 'Kota Tangerang Selatan',
  malang: 'Kota Malang',
  mlg: 'Kota Malang',
  'surakarta': 'Kota Surakarta',
  'solo': 'Kota Surakarta',
  'sal': 'Kota Surakarta',
  serang: 'Kota Serang',
  cilacap: 'Kabupaten Cilacap',
  tegal: 'Kota Tegal',
  pekalongan: 'Kota Pekalongan',
  magelang: 'Kota Magelang',
  madiun: 'Kota Madiun',
  kediri: 'Kota Kediri',
  blitar: 'Kota Blitar',
  probolinggo: 'Kota Probolinggo',
  pasuruan: 'Kota Pasuruan',
  mojokerto: 'Kota Mojokerto',
  batu: 'Kota Batu',
  tangsel: 'Kota Tangerang Selatan',
  'jakpus': 'Jakarta Pusat',
  'jakbar': 'Jakarta Barat',
  'jaksel': 'Jakarta Selatan',
  'jaktim': 'Jakarta Timur',
  'jakut': 'Jakarta Utara',
}

/**
 * Generate aliases from a raw city name.
 * Strips prefixes, keeps the core name, and adds the lowercased form.
 */
function generateAliases(cityName: string): string[] {
  const aliases = new Set<string>()
  const lower = cityName.toLowerCase().trim()

  // Always add the full lowercase name
  aliases.add(lower)

  // Strip prefix and add the core name
  const stripped = lower.replace(PREFIX_RE, '').trim()
  if (stripped && stripped !== lower) {
    aliases.add(stripped)
    // Also add without spaces for compact matching (e.g., "jakartapusat")
    aliases.add(stripped.replace(/\s+/g, ''))
  }

  return [...aliases]
}

export class CityIndex {
  private cities: CityEntry[] = []
  private keywordIndex: Map<string, CityEntry> = new Map()
  private loaded = false
  private loadPromise: Promise<void> | null = null

  /** Lazily load all cities from the database. */
  async load(): Promise<void> {
    if (this.loaded) return
    if (this.loadPromise) return this.loadPromise

    this.loadPromise = (async () => {
      try {
        const pool = getPool()
        const { rows } = await pool.query(
          `SELECT province_code, province_name, city_code, city_name FROM cities ORDER BY city_name`,
        )

        this.cities = rows.map((row: { province_code: string; province_name: string; city_code: string; city_name: string }) => ({
          provinceCode: row.province_code,
          provinceName: row.province_name,
          cityCode: row.city_code,
          cityName: row.city_name,
          aliases: generateAliases(row.city_name),
        }))

        console.info(`[CityIndex] Loaded ${this.cities.length} cities from database`)
      } catch {
        // DB unavailable (e.g., tests) — fall back to static JSON data
        console.info('[CityIndex] DB unavailable, falling back to static wilayah data')
        this.cities = STATIC_WILAYAH.map((entry) => ({
          provinceCode: entry.provinceCode,
          provinceName: entry.provinceName,
          cityCode: entry.cityCode,
          cityName: entry.cityName,
          aliases: generateAliases(entry.cityName),
        }))
      }

      // Build keyword index from abbreviations + aliases
      for (const [keyword, canonicalCityName] of Object.entries(KEYWORD_ABBREVIATIONS)) {
        const match = this.cities.find(
          (c) => c.cityName.toLowerCase() === canonicalCityName.toLowerCase(),
        )
        if (match) {
          this.keywordIndex.set(keyword.toLowerCase(), match)
        }
      }

      // Also index all aliases for exact lookup
      for (const city of this.cities) {
        for (const alias of city.aliases) {
          if (!this.keywordIndex.has(alias)) {
            this.keywordIndex.set(alias, city)
          }
        }
      }

      this.loaded = true
      console.info(`[CityIndex] Indexed ${this.cities.length} cities, ${this.keywordIndex.size} keyword entries`)
    })()

    return this.loadPromise
  }

  /**
   * Match a raw city string to a canonical city entry.
   * Uses 3-tier approach: exact match → keyword index → fuzzy match.
   */
  async match(rawCity: string | null): Promise<CityMatch | null> {
    if (!rawCity) return null

    await this.load()
    if (this.cities.length === 0) return null

    const normalized = rawCity.toLowerCase().trim()
    const stripped = normalized.replace(PREFIX_RE, '').trim()

    // Tier 1: Keyword index (abbreviations + aliases)
    const keywordHit = this.keywordIndex.get(normalized) ?? this.keywordIndex.get(stripped)
    if (keywordHit) return keywordHit

    // Tier 2: Exact match against cityName or aliases
    for (const entry of this.cities) {
      const entryLower = entry.cityName.toLowerCase()
      if (entryLower === normalized || entryLower === stripped) return entry
      for (const alias of entry.aliases) {
        if (alias === normalized || alias === stripped) return entry
      }
    }

    // Tier 3: Jaro-Winkler fuzzy match (threshold 0.85)
    let bestScore = 0
    let bestMatch: CityEntry | null = null
    for (const entry of this.cities) {
      const entryStripped = entry.cityName.toLowerCase().replace(PREFIX_RE, '').trim()
      const score = jaroWinkler(stripped, entryStripped)
      if (score > bestScore) {
        bestScore = score
        bestMatch = entry
      }
    }
    if (bestScore >= 0.85 && bestMatch) return bestMatch

    return null
  }
}

/** Jaro-Winkler similarity (returns 0–1) */
function jaroWinkler(s1: string, s2: string): number {
  if (s1 === s2) return 1
  const len1 = s1.length
  const len2 = s2.length
  const matchDist = Math.floor(Math.max(len1, len2) / 2) - 1
  if (matchDist < 0) return 0

  const s1Matches = new Array(len1).fill(false)
  const s2Matches = new Array(len2).fill(false)
  let matches = 0
  let transpositions = 0

  for (let i = 0; i < len1; i++) {
    const start = Math.max(0, i - matchDist)
    const end = Math.min(i + matchDist + 1, len2)
    for (let j = start; j < end; j++) {
      if (s2Matches[j] || s1[i] !== s2[j]) continue
      s1Matches[i] = true
      s2Matches[j] = true
      matches++
      break
    }
  }

  if (matches === 0) return 0

  let k = 0
  for (let i = 0; i < len1; i++) {
    if (!s1Matches[i]) continue
    while (!s2Matches[k]) k++
    if (s1[i] !== s2[k]) transpositions++
    k++
  }

  const jaro = (matches / len1 + matches / len2 + (matches - transpositions / 2) / matches) / 3
  const prefix = [...s1].findIndex((c, i) => c !== s2[i])
  const prefixLen = Math.min(prefix === -1 ? Math.min(len1, len2) : prefix, 4)
  return jaro + prefixLen * 0.1 * (1 - jaro)
}
