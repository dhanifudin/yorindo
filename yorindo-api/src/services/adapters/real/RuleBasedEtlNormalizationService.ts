import type { IEtlNormalizationService, NormalizedRow, RawContactRow } from '../../../interfaces/services/IEtlNormalizationService.js'
import WILAYAH_RAW from '../../../data/wilayah-static.json' with { type: 'json' }

interface WilayahEntry {
  provinceCode: string
  provinceName: string
  cityCode: string
  cityName: string
  aliases: string[]
}

interface CityMatch {
  provinceCode: string
  provinceName: string
  cityCode: string
  cityName: string
}

const WILAYAH = WILAYAH_RAW as WilayahEntry[]

// Keyword alias map for very common abbreviations that fuzzy matching may miss
const KEYWORD_MAP: Record<string, CityMatch> = {
  jkt: { provinceCode: '31', provinceName: 'DKI Jakarta', cityCode: '31.71', cityName: 'Jakarta Pusat' },
  jakarta: { provinceCode: '31', provinceName: 'DKI Jakarta', cityCode: '31.71', cityName: 'Jakarta Pusat' },
  sby: { provinceCode: '35', provinceName: 'Jawa Timur', cityCode: '35.78', cityName: 'Kota Surabaya' },
  surabaya: { provinceCode: '35', provinceName: 'Jawa Timur', cityCode: '35.78', cityName: 'Kota Surabaya' },
  bdg: { provinceCode: '32', provinceName: 'Jawa Barat', cityCode: '32.73', cityName: 'Kota Bandung' },
  bandung: { provinceCode: '32', provinceName: 'Jawa Barat', cityCode: '32.73', cityName: 'Kota Bandung' },
  medan: { provinceCode: '12', provinceName: 'Sumatera Utara', cityCode: '12.71', cityName: 'Kota Medan' },
  semarang: { provinceCode: '33', provinceName: 'Jawa Tengah', cityCode: '33.74', cityName: 'Kota Semarang' },
  yogyakarta: { provinceCode: '34', provinceName: 'DI Yogyakarta', cityCode: '34.71', cityName: 'Kota Yogyakarta' },
  jogja: { provinceCode: '34', provinceName: 'DI Yogyakarta', cityCode: '34.71', cityName: 'Kota Yogyakarta' },
  makassar: { provinceCode: '73', provinceName: 'Sulawesi Selatan', cityCode: '73.71', cityName: 'Kota Makassar' },
  palembang: { provinceCode: '16', provinceName: 'Sumatera Selatan', cityCode: '16.71', cityName: 'Kota Palembang' },
  balikpapan: { provinceCode: '64', provinceName: 'Kalimantan Timur', cityCode: '64.71', cityName: 'Kota Balikpapan' },
  denpasar: { provinceCode: '51', provinceName: 'Bali', cityCode: '51.71', cityName: 'Kota Denpasar' },
  bali: { provinceCode: '51', provinceName: 'Bali', cityCode: '51.71', cityName: 'Kota Denpasar' },
}

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

function stripLocationPrefix(raw: string): string {
  return raw.replace(/^(kota|kabupaten|kab\.?|kot\.?)\s+/i, '').trim()
}

function mapCityToCode(rawCity: string | null): CityMatch | null {
  if (!rawCity) return null
  const normalized = rawCity.toLowerCase().trim()
  const stripped = stripLocationPrefix(normalized)

  // 1. Exact match against cityName or aliases
  for (const entry of WILAYAH) {
    const entryName = entry.cityName.toLowerCase()
    if (entryName === normalized || entryName === stripped) {
      return entry
    }
    if (entry.aliases.some((a) => a === normalized || a === stripped)) {
      return entry
    }
  }

  // 2. Keyword alias map
  const keyword = KEYWORD_MAP[normalized] ?? KEYWORD_MAP[stripped]
  if (keyword) return keyword

  // 3. Jaro-Winkler fuzzy match (threshold 0.85) against cityName
  let bestScore = 0
  let bestMatch: CityMatch | null = null
  for (const entry of WILAYAH) {
    const score = jaroWinkler(stripped, stripLocationPrefix(entry.cityName.toLowerCase()))
    if (score > bestScore) {
      bestScore = score
      bestMatch = entry
    }
  }
  if (bestScore >= 0.85 && bestMatch) return bestMatch

  return null
}

function normalizePhone(value: string | null | undefined): string | null {
  const digits = String(value ?? '').replace(/\D/g, '')
  if (!digits) return null
  if (digits.startsWith('0')) return `+62${digits.slice(1)}`
  if (digits.startsWith('62')) return `+${digits}`
  if (digits.startsWith('8')) return `+62${digits}`
  return null
}

function normalizeEmail(value: string | null | undefined): string | null {
  const email = String(value ?? '').trim().toLowerCase()
  if (!email) return null
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null
}

export class RuleBasedEtlNormalizationService implements IEtlNormalizationService {
  private toTitleCase(str: string): string {
    const trimmed = str.trim()
    if (!trimmed) return ''
    return trimmed
      .split(/\s+/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
  }

  async normalizeBatch(rows: RawContactRow[]): Promise<NormalizedRow[]> {
    return this.normalizeRow(rows)
  }

  normalizeRow(rows: RawContactRow[]): NormalizedRow[] {
    return rows.map((row) => {
      const name = this.toTitleCase(String(row.name ?? ''))
      const phone = normalizePhone(String(row.phone ?? ''))
      const email = normalizeEmail(row.email ? String(row.email) : null)
      const city = row.city ? this.toTitleCase(String(row.city)) : null
      const company = row.company ? this.toTitleCase(String(row.company)) : null
      const department = row.department ? this.toTitleCase(String(row.department)) : null
      const serviceType = row.industryRaw || row.industry ? this.toTitleCase(String(row.industryRaw ?? row.industry)) : null
      const jobTitle = row.jobTitleRaw || row.jobTitle ? this.toTitleCase(String(row.jobTitleRaw ?? row.jobTitle)) : null

      const locationMatch = mapCityToCode(city)

      const flags: string[] = []
      let confidence = 0.95

      if (!name || name === 'Unknown') {
        flags.push('missing_name')
        confidence = Math.min(confidence, 0.4)
      }

      if (phone === null) {
        flags.push('missing_phone')
        confidence = Math.min(confidence, 0.4)
      }

      if (row.email && !email) {
        flags.push('invalid_email')
        confidence = Math.min(confidence, 0.6)
      }

      if (confidence < 0.8) {
        flags.push('low_confidence')
      }

      return {
        name: name || 'Unknown',
        phone,
        email,
        city,
        provinceCode: locationMatch?.provinceCode ?? null,
        provinceName: locationMatch?.provinceName ?? null,
        cityCode: locationMatch?.cityCode ?? null,
        cityName: locationMatch?.cityName ?? null,
        company,
        department,
        serviceType,
        jobTitle,
        confidence,
        flags,
        eventDate: row.eventDate ? String(row.eventDate) : null,
        eventNameRaw: row.eventNameRaw ? String(row.eventNameRaw) : null,
      }
    })
  }
}
