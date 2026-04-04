import type { IContactRepository } from '../interfaces/repositories/IContactRepository.js'
import type { IDeduplicationService } from '../interfaces/services/IDeduplicationService.js'
import type { Contact, DuplicateMatchReason } from '../types/domain.js'

export class FuzzyDeduplicationService implements IDeduplicationService {
  private readonly SIMILARITY_THRESHOLD = 0.85

  constructor(private contactRepository: IContactRepository) {}

  async findPotentialDuplicates(contact: Contact): Promise<void> {
    // 1. Fetch all existing contacts (excluding the current one)
    // For small in-memory datasets, we fetch all. In production, we'd use fuzzy search queries.
    const { data: others } = await this.contactRepository.findAll({ page: 1, pageSize: 5000 })
    
    for (const other of others) {
      if (other.id === contact.id) continue

      const matchReasons: DuplicateMatchReason[] = []

      // Check Exact Email
      if (contact.email && other.email && contact.email.toLowerCase() === other.email.toLowerCase()) {
        matchReasons.push('same_email')
      }

      // Check Exact Phone
      if (contact.phone && other.phone && contact.phone === other.phone) {
        matchReasons.push('same_phone')
      }

      // Check Similar Name
      const nameSimilarity = this.calculateSimilarity(
        contact.name.toLowerCase().trim(),
        other.name.toLowerCase().trim()
      )
      if (nameSimilarity >= this.SIMILARITY_THRESHOLD) {
        matchReasons.push('similar_name')
      }

      // If we found any match reason, create a duplicate pair
      if (matchReasons.length > 0) {
        const score = this.calculateFinalScore(matchReasons, nameSimilarity)
        await this.contactRepository.createDuplicatePair({
          primary: other, // The existing one is primary
          duplicate: contact, // The new/updated one is the duplicate
          matchScore: score,
          matchReasons,
        })
      }
    }
  }

  /**
   * Simple Levenshtein-based similarity score (0.0 to 1.0)
   */
  private calculateSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1.0
    if (str1.length === 0 || str2.length === 0) return 0.0

    const len1 = str1.length
    const len2 = str2.length
    const matrix: number[][] = []

    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i]
    }
    for (let j = 0; j <= len2; j++) {
      matrix[0]![j] = j
    }

    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1
        matrix[i]![j] = Math.min(
          matrix[i - 1]![j]! + 1,
          matrix[i]![j - 1]! + 1,
          matrix[i - 1]![j - 1]! + cost
        )
      }
    }

    const distance = matrix[len1]![len2]!
    const maxLen = Math.max(len1, len2)
    return 1.0 - distance / maxLen
  }

  private calculateFinalScore(reasons: DuplicateMatchReason[], nameSimilarity: number): number {
    if (reasons.includes('same_email') || reasons.includes('same_phone')) return 1.0
    return Math.round(nameSimilarity * 100) / 100
  }
}
