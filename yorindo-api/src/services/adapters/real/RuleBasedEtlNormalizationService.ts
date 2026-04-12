import type { IEtlNormalizationService, NormalizedRow, RawContactRow } from '../../../interfaces/services/IEtlNormalizationService.js'
import { CityIndex } from './CityIndex.js'

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
  private cityIndex = new CityIndex()

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

  private async normalizeRow(rows: RawContactRow[]): Promise<NormalizedRow[]> {
    const results: NormalizedRow[] = []

    for (const row of rows) {
      const name = this.toTitleCase(String(row.name ?? ''))
      const phone = normalizePhone(String(row.phone ?? ''))
      const email = normalizeEmail(row.email ? String(row.email) : null)
      const city = row.city ? this.toTitleCase(String(row.city)) : null
      const company = row.company ? this.toTitleCase(String(row.company)) : null
      const department = row.department ? this.toTitleCase(String(row.department)) : null
      const serviceType = row.industryRaw || row.industry ? this.toTitleCase(String(row.industryRaw ?? row.industry)) : null
      const jobTitle = row.jobTitleRaw || row.jobTitle ? this.toTitleCase(String(row.jobTitleRaw ?? row.jobTitle)) : null

      const locationMatch = await this.mapCityToCode(city)

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

      results.push({
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
      })
    }

    return results
  }

  /**
   * Map a raw city string to canonical province/city codes.
   * Delegates to CityIndex which loads data from the DB.
   */
  private async mapCityToCode(rawCity: string | null): Promise<{
    provinceCode: string
    provinceName: string
    cityCode: string
    cityName: string
  } | null> {
    if (!rawCity) return null
    return this.cityIndex.match(rawCity)
  }
}
