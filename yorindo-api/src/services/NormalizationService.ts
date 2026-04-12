/**
 * NormalizationService
 *
 * Fuzzy-matches contact serviceType and jobTitle against standard
 * industries and job titles. Returns match suggestions or flags
 * contacts when no acceptable match is found.
 *
 * Uses Jaro-Winkler similarity with 80% threshold.
 */

import type { Pool } from 'pg'

const MATCH_THRESHOLD = 0.80

interface StandardValue {
  id: string
  slug: string
  name: string
}

interface MatchResult {
  matched: boolean
  suggestion: StandardValue | null
  confidence: number
}

/**
 * Jaro-Winkler similarity between two strings.
 * Returns a score between 0 and 1.
 */
function jaroWinkler(s1: string, s2: string): number {
  if (s1 === s2) return 1.0
  if (s1.length === 0 || s2.length === 0) return 0.0

  const maxDist = Math.floor(Math.max(s1.length, s2.length) / 2) - 1
  if (maxDist <= 0) return s1 === s2 ? 1.0 : 0.0

  // Find matches
  const s1Matches = new Array(s1.length).fill(false)
  const s2Matches = new Array(s2.length).fill(false)

  let matches = 0
  let transpositions = 0

  for (let i = 0; i < s1.length; i++) {
    const start = Math.max(0, i - maxDist)
    const end = Math.min(i + maxDist + 1, s2.length)
    for (let j = start; j < end; j++) {
      if (s2Matches[j] || s1[i] !== s2[j]) continue
      s1Matches[i] = true
      s2Matches[j] = true
      matches++
      break
    }
  }

  if (matches === 0) return 0.0

  // Count transpositions
  let k = 0
  for (let i = 0; i < s1.length; i++) {
    if (!s1Matches[i]) continue
    while (!s2Matches[k]) k++
    if (s1[i] !== s2[k]) transpositions++
    k++
  }

  const jaro = (matches / s1.length + matches / s2.length + (matches - transpositions / 2) / matches) / 3

  // Winkler boost: common prefix up to 4 chars
  let prefix = 0
  for (let i = 0; i < Math.min(4, s1.length, s2.length); i++) {
    if (s1[i] === s2[i]) prefix++
    else break
  }

  return jaro + prefix * 0.1 * (1 - jaro)
}

/**
 * Normalize a string for comparison: lowercase, strip extra spaces.
 */
function normalize(s: string): string {
  return s.toLowerCase().replace(/\s+/g, ' ').trim()
}

export class NormalizationService {
  constructor(private pool: Pool) {}

  /**
   * Load all standard industries from the database.
   */
  async loadIndustries(): Promise<StandardValue[]> {
    const { rows } = await this.pool.query<{ id: string; slug: string; name: string }>(
      'SELECT id, slug, name FROM industries ORDER BY name',
    )
    return rows.map(r => ({ id: r.id, slug: r.slug, name: r.name }))
  }

  /**
   * Load all standard job titles from the database.
   */
  async loadJobTitles(): Promise<StandardValue[]> {
    const { rows } = await this.pool.query<{ id: string; slug: string; name: string }>(
      'SELECT id, slug, name FROM job_titles ORDER BY name',
    )
    return rows.map(r => ({ id: r.id, slug: r.slug, name: r.name }))
  }

  /**
   * Find the best matching industry for a given serviceType value.
   */
  async matchIndustry(serviceType: string): Promise<MatchResult> {
    if (!serviceType || !serviceType.trim()) return { matched: false, suggestion: null, confidence: 0 }

    const industries = await this.loadIndustries()
    const normalized = normalize(serviceType)

    let bestMatch: StandardValue | null = null
    let bestScore = 0

    for (const ind of industries) {
      const score = jaroWinkler(normalized, normalize(ind.name))
      if (score > bestScore) {
        bestScore = score
        bestMatch = ind
      }
    }

    return {
      matched: bestScore >= MATCH_THRESHOLD,
      suggestion: bestMatch,
      confidence: Math.round(bestScore * 100) / 100,
    }
  }

  /**
   * Find the best matching job title for a given jobTitle value.
   */
  async matchJobTitle(jobTitle: string): Promise<MatchResult> {
    if (!jobTitle || !jobTitle.trim()) return { matched: false, suggestion: null, confidence: 0 }

    const titles = await this.loadJobTitles()
    const normalized = normalize(jobTitle)

    let bestMatch: StandardValue | null = null
    let bestScore = 0

    for (const title of titles) {
      const score = jaroWinkler(normalized, normalize(title.name))
      if (score > bestScore) {
        bestScore = score
        bestMatch = title
      }
    }

    return {
      matched: bestScore >= MATCH_THRESHOLD,
      suggestion: bestMatch,
      confidence: Math.round(bestScore * 100) / 100,
    }
  }

  /**
   * Get contacts that are flagged as unmatched for industry or job title.
   */
  async getUnmatchedContacts(type: 'industry-unmatched' | 'jobtitle-unmatched', page = 1, pageSize = 50) {
    const offset = (page - 1) * pageSize
    const col = type === 'industry-unmatched' ? 'service_type' : 'job_title'

    const countResult = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*) FROM contacts WHERE flag_category = $1 AND ${col} IS NOT NULL AND ${col} != ''`,
      [type],
    )
    const total = parseInt(countResult.rows[0]?.count ?? '0', 10)

    const { rows } = await this.pool.query<{
      id: string
      name: string
      phone: string | null
      email: string | null
      service_type: string | null
      job_title: string | null
      company: string | null
      created_at: Date
    }>(
      `SELECT id, name, phone, email, service_type, job_title, company, created_at
       FROM contacts
       WHERE flag_category = $1 AND ${col} IS NOT NULL AND ${col} != ''
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [type, pageSize, offset],
    )

    return {
      contacts: rows,
      total,
      totalPages: Math.ceil(total / pageSize),
    }
  }

  /**
   * Normalize a single contact's serviceType or jobTitle to the suggested standard value.
   */
  async normalizeContact(
    contactId: string,
    field: 'serviceType' | 'jobTitle',
    standardId: string,
  ): Promise<void> {
    const col = field === 'serviceType' ? 'service_type' : 'job_title'
    const standardTable = field === 'serviceType' ? 'industries' : 'job_titles'

    await this.pool.query(
      `UPDATE contacts SET ${col} = (SELECT name FROM ${standardTable} WHERE id = $1), flag_category = NULL WHERE id = $2`,
      [standardId, contactId],
    )
  }

  /**
   * Bulk normalize multiple contacts at once.
   */
  async bulkNormalize(
    contactIds: string[],
    field: 'serviceType' | 'jobTitle',
    standardId: string,
  ): Promise<number> {
    const col = field === 'serviceType' ? 'service_type' : 'job_title'
    const standardTable = field === 'serviceType' ? 'industries' : 'job_titles'

    const { rowCount } = await this.pool.query(
      `UPDATE contacts SET ${col} = (SELECT name FROM ${standardTable} WHERE id = $1), flag_category = NULL WHERE id = ANY($2)`,
      [standardId, contactIds],
    )

    return rowCount ?? 0
  }

  /**
   * Scan contacts and flag those whose serviceType/jobTitle
   * don't match any standard value.
   */
  async flagUnmatchedContacts(): Promise<{ industryCount: number; jobTitleCount: number }> {
    const industries = await this.loadIndustries()
    const titles = await this.loadJobTitles()

    let industryCount = 0
    let jobTitleCount = 0

    // Flag unmatched industries
    const { rows: industryContacts } = await this.pool.query<{ id: string; service_type: string }>(
      `SELECT id, service_type FROM contacts WHERE service_type IS NOT NULL AND service_type != '' AND flag_category IS DISTINCT FROM 'industry-unmatched'`,
    )

    for (const contact of industryContacts) {
      const result = await this.matchIndustry(contact.service_type)
      if (!result.matched) {
        await this.pool.query(
          `UPDATE contacts SET flag_category = 'industry-unmatched' WHERE id = $1`,
          [contact.id],
        )
        industryCount++
      }
    }

    // Flag unmatched job titles
    const { rows: jobTitleContacts } = await this.pool.query<{ id: string; job_title: string }>(
      `SELECT id, job_title FROM contacts WHERE job_title IS NOT NULL AND job_title != '' AND flag_category IS DISTINCT FROM 'jobtitle-unmatched'`,
    )

    for (const contact of jobTitleContacts) {
      const result = await this.matchJobTitle(contact.job_title)
      if (!result.matched) {
        await this.pool.query(
          `UPDATE contacts SET flag_category = 'jobtitle-unmatched' WHERE id = $1`,
          [contact.id],
        )
        jobTitleCount++
      }
    }

    return { industryCount, jobTitleCount }
  }
}
