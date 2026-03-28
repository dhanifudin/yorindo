import { faker } from '@faker-js/faker'
import { createId } from '@paralleldrive/cuid2'
import type { IContactRepository, PaginationParams, ContactFilters } from '../../interfaces/repositories/IContactRepository.js'
import type { Contact, DuplicateFieldChoice, DuplicateMatchReason, DuplicatePair, FacetResult } from '../../types/domain.js'
import { SEED_CONTACT_IDS, INDONESIAN_INDUSTRIES, INDONESIAN_JOB_TITLES } from './_seeds.js'

faker.seed(42)

const INDONESIAN_CITIES = ['Jakarta', 'Bandung', 'Surabaya', 'Medan', 'Yogyakarta', 'Semarang', 'Makassar', 'Palembang', 'Denpasar', 'Balikpapan']
const COMPANY_SIZES = ['<50', '50-200', '200-1000', '>1000'] as const
const SOURCES = ['excel_upload', 'excel_upload', 'excel_upload', 'form', 'manual'] as const
const DUPLICATE_PAIR_COUNT = 6

interface DuplicatePairState {
  id: string
  primaryId: string
  duplicateId: string
  matchScore: number
  matchReasons: DuplicateMatchReason[]
  resolvedAt: string | null
}

// Consent distribution: ~80% active, ~14% legacy_unverified, ~6% suppressed
function consentStatus(i: number) {
  if (i >= 115) return 'suppressed' as const
  if (i % 7 === 0) return 'legacy_unverified' as const
  return 'active' as const
}

/**
 * Mengubah slug industri FE menjadi id lookup yang dipakai di seed repository.
 */
function toIndustryId(industry?: string): string | undefined {
  if (!industry) return undefined
  const found = INDONESIAN_INDUSTRIES.find((item) => item.slug === industry || item.id === industry)
  return found?.id ?? industry
}

export class InMemoryContactRepository implements IContactRepository {
  private contacts: Map<string, Contact> = new Map()
  private duplicatePairs: Map<string, DuplicatePairState> = new Map()

  constructor() {
    this._seed()
    this._seedDuplicatePairs()
  }

  /**
   * Menyiapkan data kontak deterministik untuk dev dan test tanpa DB sungguhan.
   */
  private _seed(): void {
    for (let i = 0; i < 120; i++) {
      const id = SEED_CONTACT_IDS[i]!
      const industry = INDONESIAN_INDUSTRIES[i % INDONESIAN_INDUSTRIES.length]!
      const jobTitle = INDONESIAN_JOB_TITLES[i % INDONESIAN_JOB_TITLES.length]!
      const status = consentStatus(i)

      const contact: Contact = {
        id,
        name: faker.person.fullName(),
        phone: i >= 115
          ? `+62811000000${i}`
          : `+6281${faker.number.int({ min: 100000000, max: 999999999 })}`,
        email: i % 8 === 0 ? null : faker.internet.email(),
        industryId: i % 5 === 0 ? null : industry.id,
        jobTitleId: i % 7 === 0 ? null : jobTitle.id,
        city: INDONESIAN_CITIES[i % INDONESIAN_CITIES.length]!,
        company: faker.company.name(),
        companySize: COMPANY_SIZES[i % COMPANY_SIZES.length]!,
        source: SOURCES[i % SOURCES.length]!,
        completenessScore: Math.round((0.4 + (i % 7) * 0.09) * 1000) / 1000,
        consentStatus: status,
        flagCategory: i % 15 === 0 ? 'spam' : i % 22 === 0 ? 'not-potential' : null,
        deletedAt: null,
        createdAt: new Date(Date.now() - i * 86400000).toISOString(),
        updatedAt: new Date().toISOString(),
      }
      this.contacts.set(id, contact)
    }
  }

  /**
   * Menyiapkan pasangan duplikat deterministik agar flow review dan merge bisa dites.
   */
  private _seedDuplicatePairs(): void {
    const seededContacts = Array.from(this.contacts.values())

    for (let i = 0; i < DUPLICATE_PAIR_COUNT; i++) {
      const primary = seededContacts[i * 2]
      const duplicate = seededContacts[i * 2 + 1]
      if (!primary || !duplicate) continue

      const duplicateContact: Contact = {
        ...duplicate,
        name: primary.name.split(' ').slice(0, 2).join(' '),
        email: primary.email ?? `duplicate-${i + 1}@example.com`,
        city: primary.city,
        company: primary.company,
        industryId: primary.industryId,
        companySize: primary.companySize,
        updatedAt: new Date().toISOString(),
      }

      this.contacts.set(duplicate.id, duplicateContact)
      this.duplicatePairs.set(`dup-group-${i + 1}`, {
        id: `dup-group-${i + 1}`,
        primaryId: primary.id,
        duplicateId: duplicate.id,
        matchScore: 0.82 + i * 0.02,
        matchReasons: ['same_email', 'similar_name'],
        resolvedAt: null,
      })
    }
  }

  /**
   * Mengambil pasangan duplikat yang masih aktif dan belum diselesaikan.
   */
  private _activeDuplicatePairs(): DuplicatePair[] {
    const pairs: DuplicatePair[] = []

    for (const pair of this.duplicatePairs.values()) {
      if (pair.resolvedAt) continue

      const primary = this.contacts.get(pair.primaryId)
      const duplicate = this.contacts.get(pair.duplicateId)
      if (!primary || !duplicate) continue
      if (primary.deletedAt || duplicate.deletedAt) continue

      pairs.push({
        id: pair.id,
        primary,
        duplicate,
        matchScore: pair.matchScore,
        matchReasons: pair.matchReasons,
      })
    }

    return pairs
  }

  /**
   * Mengurutkan koleksi kontak memory berdasarkan field yang diminta.
   */
  private _sort(data: Contact[], params: PaginationParams): Contact[] {
    const sortBy = params.sortBy ?? 'createdAt'
    const sortDir = params.sortDir ?? 'desc'
    const direction = sortDir === 'asc' ? 1 : -1

    return [...data].sort((a, b) => {
      const left = this._sortValue(a, sortBy)
      const right = this._sortValue(b, sortBy)
      if (left < right) return -1 * direction
      if (left > right) return 1 * direction
      return 0
    })
  }

  /**
   * Mengubah field kontak ke nilai yang aman dibandingkan saat sorting.
   */
  private _sortValue(contact: Contact, sortBy: string): string | number {
    switch (sortBy) {
      case 'name':
        return contact.name.toLowerCase()
      case 'email':
        return (contact.email ?? '').toLowerCase()
      case 'phone':
        return contact.phone
      case 'industry':
      case 'industryId':
        return (contact.industryId ?? '').toLowerCase()
      case 'city':
        return (contact.city ?? '').toLowerCase()
      case 'company':
        return (contact.company ?? '').toLowerCase()
      case 'companySize':
        return contact.companySize ?? ''
      case 'created_at':
      case 'createdAt':
        return new Date(contact.createdAt).getTime()
      default:
        return new Date(contact.createdAt).getTime()
    }
  }

  /**
   * Mengambil daftar kontak dengan filter, sorting, lalu pagination in-memory.
   */
  async findAll(params: PaginationParams, filters?: ContactFilters): Promise<{ data: Contact[]; total: number }> {
    let data = Array.from(this.contacts.values()).filter(c => c.deletedAt === null)
    const industryId = toIndustryId(filters?.industry)

    if (industryId) data = data.filter(c => c.industryId === industryId)
    if (filters?.city) data = data.filter(c => c.city === filters.city)
    if (filters?.companySize) data = data.filter(c => c.companySize === filters.companySize)
    if (filters?.flagCategory) data = data.filter(c => c.flagCategory === filters.flagCategory)
    if (filters?.consentStatus) data = data.filter(c => c.consentStatus === filters.consentStatus)
    if (filters?.missingEmail) data = data.filter(c => c.email === null)
    if (filters?.search) {
      const q = filters.search.toLowerCase()
      data = data.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        (c.email ?? '').toLowerCase().includes(q) ||
        (c.company ?? '').toLowerCase().includes(q),
      )
    }

    data = this._sort(data, params)

    const total = data.length
    const start = (params.page - 1) * params.pageSize
    return { data: data.slice(start, start + params.pageSize), total }
  }

  async findById(id: string): Promise<Contact | null> {
    return this.contacts.get(id) ?? null
  }

  async findByPhone(phone: string): Promise<Contact | null> {
    return Array.from(this.contacts.values()).find(c => c.phone === phone) ?? null
  }

  /**
   * Mengambil daftar kandidat duplikat dengan pagination sederhana.
   */
  async findDuplicates(params: PaginationParams): Promise<{ data: DuplicatePair[]; total: number }> {
    const data = this._activeDuplicatePairs()
    const total = data.length
    const start = (params.page - 1) * params.pageSize
    return { data: data.slice(start, start + params.pageSize), total }
  }

  /**
   * Menggabungkan data duplikat ke record utama lalu menonaktifkan record duplikat.
   */
  async mergeDuplicate(
    primaryId: string,
    fieldSelections?: Record<string, DuplicateFieldChoice>,
  ): Promise<Contact | null> {
    const pair = Array.from(this.duplicatePairs.values()).find(
      (item) => item.primaryId === primaryId && item.resolvedAt === null,
    )
    if (!pair) return null

    const primary = this.contacts.get(pair.primaryId)
    const duplicate = this.contacts.get(pair.duplicateId)
    if (!primary || !duplicate) return null
    if (primary.deletedAt || duplicate.deletedAt) return null

    const merged: Contact = {
      ...primary,
      completenessScore: Math.max(primary.completenessScore, duplicate.completenessScore),
      updatedAt: new Date().toISOString(),
    }

    for (const [field, choice] of Object.entries(fieldSelections ?? {})) {
      if (choice !== 'duplicate') continue
      if (field === 'id' || field === 'createdAt' || field === 'updatedAt' || field === 'deletedAt') continue
      if (!(field in duplicate)) continue
      Object.assign(merged, { [field]: duplicate[field as keyof Contact] })
    }

    this.contacts.set(primary.id, merged)
    this.contacts.set(duplicate.id, {
      ...duplicate,
      deletedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    this.duplicatePairs.set(pair.id, {
      ...pair,
      resolvedAt: new Date().toISOString(),
    })

    return merged
  }

  async upsert(data: Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>): Promise<Contact> {
    const existing = Array.from(this.contacts.values()).find(c => c.phone === data.phone)
    if (existing) {
      const updated: Contact = { ...existing, ...data, updatedAt: new Date().toISOString() }
      this.contacts.set(existing.id, updated)
      return updated
    }
    const contact: Contact = {
      id: createId(),
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    this.contacts.set(contact.id, contact)
    return contact
  }

  async update(id: string, data: Partial<Contact>): Promise<Contact | null> {
    const existing = this.contacts.get(id)
    if (!existing) return null
    const updated: Contact = { ...existing, ...data, id, updatedAt: new Date().toISOString() }
    this.contacts.set(id, updated)
    return updated
  }

  async softDelete(id: string): Promise<void> {
    const existing = this.contacts.get(id)
    if (existing) {
      this.contacts.set(id, { ...existing, deletedAt: new Date().toISOString() })
    }
  }

  async countHealth(): Promise<{ flagged: number; duplicates: number; missingEmail: number }> {
    const all = Array.from(this.contacts.values()).filter(c => c.deletedAt === null)
    return {
      flagged: all.filter(c => c.flagCategory !== null).length,
      duplicates: this._activeDuplicatePairs().length,
      missingEmail: all.filter(c => c.email === null).length,
    }
  }

  async anonymize(id: string, hashedPhone: string): Promise<void> {
    const existing = this.contacts.get(id)
    if (!existing) return
    this.contacts.set(id, {
      ...existing,
      name: 'ANONYMIZED',
      phone: hashedPhone,
      email: null,
      consentStatus: 'suppressed',
      updatedAt: new Date().toISOString(),
    })
  }

  async existsByPhoneHash(hashedPhone: string): Promise<boolean> {
    return Array.from(this.contacts.values()).some(c => c.phone === hashedPhone)
  }

  /**
   * Menghitung facet filter dari kontak aktif agar UI bisa menampilkan opsi filter.
   */
  async findFacets(): Promise<FacetResult> {
    const all = Array.from(this.contacts.values()).filter(c => c.deletedAt === null)
    const industryMap = new Map<string, number>()
    const cityMap = new Map<string, number>()
    const sizeMap = new Map<string, number>()

    for (const c of all) {
      if (c.industryId) industryMap.set(c.industryId, (industryMap.get(c.industryId) ?? 0) + 1)
      if (c.city) cityMap.set(c.city, (cityMap.get(c.city) ?? 0) + 1)
      if (c.companySize) sizeMap.set(c.companySize, (sizeMap.get(c.companySize) ?? 0) + 1)
    }

    return {
      industries: INDONESIAN_INDUSTRIES.map(ind => ({
        id: ind.id,
        name: ind.name,
        count: all.filter(c => c.industryId === ind.id).length,
      })),
      cities: Array.from(cityMap.entries()).map(([city, count]) => ({ city, count })),
      companySizes: Array.from(sizeMap.entries()).map(([size, count]) => ({ size, count })),
    }
  }
}
