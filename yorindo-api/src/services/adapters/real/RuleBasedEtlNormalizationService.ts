import type { IEtlNormalizationService, NormalizedRow, RawContactRow } from '../../../interfaces/services/IEtlNormalizationService.js'

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
  /**
   * Title Case converter for cleaner raw inputs
   */
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
        company,
        department,
        serviceType,
        jobTitle,
        confidence,
        flags,
        provinceCode: null,
        provinceName: null,
        cityCode: null,
        cityName: city,
        eventDate: row.eventDate ? String(row.eventDate) : null,
        eventNameRaw: row.eventNameRaw ? String(row.eventNameRaw) : null,
      }
    })
  }
}
