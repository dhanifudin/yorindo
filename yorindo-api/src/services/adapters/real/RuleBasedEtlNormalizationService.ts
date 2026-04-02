import wilayahData from '../../../data/wilayah-static.json' with { type: 'json' }
import type { IEtlNormalizationService, NormalizedRow, RawContactRow } from '../../../interfaces/services/IEtlNormalizationService.js'

type WilayahCity = {
  provinceCode: string
  provinceName: string
  cityCode: string
  cityName: string
  aliases?: string[]
}

const COMPANY_SIZE_MAP: Array<{ keywords: string[]; value: '<50' | '50-200' | '200-1000' | '>1000' }> = [
  { keywords: ['small', 'kecil', '<50', '1-49'], value: '<50' },
  { keywords: ['medium', 'menengah', '50-200'], value: '50-200' },
  { keywords: ['large', 'besar', '200-1000'], value: '200-1000' },
  { keywords: ['enterprise', '>1000', '1000+'], value: '>1000' },
]

const INDUSTRY_KEYWORD_MAP: Array<{ keywords: string[]; slug: string }> = [
  { keywords: ['teknologi', 'teknologi informasi', 'software', 'digital', 'it '], slug: 'teknologi' },
  { keywords: ['kesehatan', 'rumah sakit', 'klinik', 'medis', 'farmasi'], slug: 'kesehatan' },
  { keywords: ['keuangan', 'bank', 'perbankan', 'asuransi', 'finansial'], slug: 'keuangan' },
  { keywords: ['pendidikan', 'universitas', 'sekolah', 'kampus'], slug: 'pendidikan' },
  { keywords: ['manufaktur', 'manufacturing', 'pabrik', 'garment', 'garmen'], slug: 'manufaktur' },
  { keywords: ['retail', 'ritel', 'distribusi', 'perdagangan'], slug: 'retail' },
  { keywords: ['properti', 'property', 'konstruksi', 'bangunan'], slug: 'properti' },
]

const JOB_TITLE_KEYWORD_MAP: Array<{ keywords: string[]; slug: string }> = [
  { keywords: ['direktur', 'director'], slug: 'direktur' },
  { keywords: ['manager', 'manajer', 'mgr'], slug: 'manajer' },
  { keywords: ['supervisor', 'spv'], slug: 'supervisor' },
  { keywords: ['staff', 'staf', 'admin'], slug: 'staf' },
  { keywords: ['engineer', 'developer'], slug: 'engineer' },
  { keywords: ['analyst', 'analis'], slug: 'analis' },
  { keywords: ['consultant', 'konsultan'], slug: 'konsultan' },
  { keywords: ['owner', 'founder', 'wirausaha'], slug: 'wirausaha' },
]

const CITY_ALIAS_MAP: Record<string, { provinceCode: string; cityCode: string | null }> = {
  jkt: { provinceCode: '31', cityCode: '31.71' },
  jakarta: { provinceCode: '31', cityCode: null },
  surabaya: { provinceCode: '35', cityCode: '35.78' },
  purwakarta: { provinceCode: '32', cityCode: '32.14' },
}

function normalizeText(value: string | null | undefined): string {
  return String(value ?? '')
    .toLowerCase()
    .replace(/\./g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizePhone(value: string | null | undefined): string {
  const digits = String(value ?? '').replace(/\D/g, '')
  if (!digits) return '+620000000000'
  if (digits.startsWith('0')) return `+62${digits.slice(1)}`
  if (digits.startsWith('62')) return `+${digits}`
  if (digits.startsWith('8')) return `+62${digits}`
  return '+620000000000'
}

function normalizeEmail(value: string | null | undefined): string | null {
  const email = String(value ?? '').trim().toLowerCase()
  if (!email) return null
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null
}

function matchByKeywords(value: string, map: Array<{ keywords: string[]; slug?: string; value?: string }>): string | null {
  for (const item of map) {
    if (item.keywords.some((keyword) => value.includes(keyword))) {
      return item.slug ?? item.value ?? null
    }
  }
  return null
}

function jaroWinkler(left: string, right: string): number {
  if (left === right) return 1
  if (!left || !right) return 0

  const matchDistance = Math.floor(Math.max(left.length, right.length) / 2) - 1
  const leftMatches = new Array<boolean>(left.length).fill(false)
  const rightMatches = new Array<boolean>(right.length).fill(false)

  let matches = 0
  for (let i = 0; i < left.length; i++) {
    const start = Math.max(0, i - matchDistance)
    const end = Math.min(i + matchDistance + 1, right.length)
    for (let j = start; j < end; j++) {
      if (rightMatches[j] || left[i] !== right[j]) continue
      leftMatches[i] = true
      rightMatches[j] = true
      matches++
      break
    }
  }

  if (matches === 0) return 0

  let transpositions = 0
  let rightIndex = 0
  for (let i = 0; i < left.length; i++) {
    if (!leftMatches[i]) continue
    while (!rightMatches[rightIndex]) rightIndex++
    if (left[i] !== right[rightIndex]) transpositions++
    rightIndex++
  }

  const jaro = (
    matches / left.length +
    matches / right.length +
    (matches - transpositions / 2) / matches
  ) / 3

  let prefix = 0
  while (prefix < 4 && left[prefix] === right[prefix]) prefix++
  return jaro + prefix * 0.1 * (1 - jaro)
}

export class RuleBasedEtlNormalizationService implements IEtlNormalizationService {
  private wilayah = wilayahData as WilayahCity[]

  mapCityToCode(rawCity: string | null | undefined): Pick<NormalizedRow, 'provinceCode' | 'provinceName' | 'cityCode' | 'cityName'> & { confidence: number | null } {
    const normalizedCity = normalizeText(rawCity)
      .replace(/^kota\s+/, '')
      .replace(/^kabupaten\s+/, '')
      .replace(/^kab\s+/, '')

    if (!normalizedCity) {
      return { provinceCode: null, provinceName: null, cityCode: null, cityName: null, confidence: null }
    }

    const exactMatch = this.wilayah.find((entry) => {
      const candidates = [entry.cityName, ...(entry.aliases ?? [])].map((value) => normalizeText(value))
      return candidates.includes(normalizedCity)
    })
    if (exactMatch) {
      return {
        provinceCode: exactMatch.provinceCode,
        provinceName: exactMatch.provinceName,
        cityCode: exactMatch.cityCode,
        cityName: exactMatch.cityName,
        confidence: 1,
      }
    }

    let bestMatch: WilayahCity | null = null
    let bestScore = 0
    for (const entry of this.wilayah) {
      const candidates = [entry.cityName, ...(entry.aliases ?? [])]
      for (const candidate of candidates) {
        const score = jaroWinkler(normalizeText(candidate), normalizedCity)
        if (score > bestScore) {
          bestScore = score
          bestMatch = entry
        }
      }
    }
    if (bestMatch && bestScore >= 0.85) {
      return {
        provinceCode: bestMatch.provinceCode,
        provinceName: bestMatch.provinceName,
        cityCode: bestMatch.cityCode,
        cityName: bestMatch.cityName,
        confidence: 0.8,
      }
    }

    const alias = CITY_ALIAS_MAP[normalizedCity]
    if (alias) {
      const matchedCity = alias.cityCode
        ? this.wilayah.find((entry) => entry.cityCode === alias.cityCode) ?? null
        : this.wilayah.find((entry) => entry.provinceCode === alias.provinceCode) ?? null

      return {
        provinceCode: alias.provinceCode,
        provinceName: matchedCity?.provinceName ?? null,
        cityCode: alias.cityCode,
        cityName: matchedCity?.cityName ?? null,
        confidence: 0.7,
      }
    }

    return { provinceCode: null, provinceName: null, cityCode: null, cityName: null, confidence: null }
  }

  async normalizeBatch(rows: RawContactRow[]): Promise<NormalizedRow[]> {
    return rows.map((row) => {
      const name = String(row.name ?? '').trim()
      const phone = normalizePhone(String(row.phone ?? ''))
      const email = normalizeEmail(row.email ? String(row.email) : null)
      const city = row.city ? String(row.city).trim() : null
      const company = row.company ? String(row.company).trim() : null
      const department = row.department ? String(row.department).trim() : null
      const industryRaw = normalizeText(String(row.industryRaw ?? row.industry ?? ''))
      const jobTitleRaw = normalizeText(String(row.jobTitleRaw ?? row.jobTitle ?? ''))
      const companySizeRaw = normalizeText(String(row.companySizeRaw ?? row.companySize ?? ''))
      const flags: string[] = []
      let confidence = 0.95

      if (!name) {
        flags.push('missing_name')
        confidence = Math.min(confidence, 0.4)
      }

      if (phone === '+620000000000') {
        flags.push('invalid_phone')
        confidence = Math.min(confidence, 0.4)
      }

      if (row.email && !email) {
        flags.push('invalid_email')
        confidence = Math.min(confidence, 0.6)
      }

      const industrySlug = matchByKeywords(industryRaw, INDUSTRY_KEYWORD_MAP) as string | null
      if (!industrySlug && industryRaw) {
        flags.push('unknown_industry')
        confidence = Math.min(confidence, 0.75)
      }

      const jobTitleSlug = matchByKeywords(jobTitleRaw, JOB_TITLE_KEYWORD_MAP) as string | null
      const companySize = matchByKeywords(companySizeRaw, COMPANY_SIZE_MAP) as NormalizedRow['companySize']
      const cityMapping = this.mapCityToCode(city)

      return {
        name: name || 'Unknown',
        phone,
        email,
        city,
        company,
        department,
        companySize: companySize ?? null,
        industrySlug,
        jobTitleSlug,
        confidence,
        flags,
        provinceCode: cityMapping.provinceCode,
        provinceName: cityMapping.provinceName,
        cityCode: cityMapping.cityCode,
        cityName: cityMapping.cityName,
        eventDate: row.eventDate ? String(row.eventDate) : null,
        eventNameRaw: row.eventNameRaw ? String(row.eventNameRaw) : null,
      }
    })
  }
}
