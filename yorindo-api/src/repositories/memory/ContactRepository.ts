import { faker } from '@faker-js/faker'
import { createId } from '@paralleldrive/cuid2'
import type { IContactRepository, PaginationParams, ContactFilters } from '../../interfaces/repositories/IContactRepository.js'
import type { Contact, DuplicateFieldChoice, DuplicateMatchReason, DuplicatePair, FacetResult, EntityId } from '../../types/domain.js'
import { SEED_CONTACT_IDS, INDONESIAN_INDUSTRIES, INDONESIAN_JOB_TITLES } from './_seeds.js'

faker.seed(42)

const INDONESIAN_CITIES = ['Jakarta', 'Bandung', 'Surabaya', 'Medan', 'Yogyakarta', 'Semarang', 'Makassar', 'Palembang', 'Denpasar', 'Balikpapan']
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

function consentStatus(i: number) {
  if (i >= 115) return 'suppressed' as const
  if (i % 7 === 0) return 'legacy_unverified' as const
  return 'active' as const
}

export class InMemoryContactRepository implements IContactRepository {
  private contacts: Map<string, Contact> = new Map()
  private duplicatePairs: Map<string, DuplicatePairState> = new Map()

  constructor() {
    this._seed()
    this._seedDuplicatePairs()
  }

  private _seed(): void {
    for (let i = 0; i < 120; i++) {
      const id = SEED_CONTACT_IDS[i]!
      const industry = INDONESIAN_INDUSTRIES[i % INDONESIAN_INDUSTRIES.length]!
      const jobTitle = INDONESIAN_JOB_TITLES[i % INDONESIAN_JOB_TITLES.length]!
      const status = consentStatus(i)

      const contact: Contact = {
        id,
        name: faker.name.fullName(),
        phone: i >= 115
          ? null
          : `+6281${faker.datatype.number({ min: 100000000, max: 999999999 })}`,
        email: i % 8 === 0 ? null : faker.internet.email(),
        serviceType: i % 5 === 0 ? null : industry.name,
        jobTitle: i % 7 === 0 ? null : jobTitle.name,
        city: INDONESIAN_CITIES[i % INDONESIAN_CITIES.length]!,
        provinceCode: null,
        provinceName: null,
        cityCode: null,
        cityName: null,
        company: faker.company.name(),
        department: i % 6 === 0 ? 'Engineering' : 'Marketing',
        eventDate: i % 10 === 0 ? '2024-03-20' : null,
        topicTags: i % 3 === 0 ? ['ai', 'cloud'] : i % 3 === 1 ? ['fintech'] : null,
        source: SOURCES[i % SOURCES.length]!,
        completenessScore: Math.round((0.4 + (i % 7) * 0.09) * 1000) / 1000,
        consentStatus: status,
        flagCategory: i % 17 === 0 ? 'invalid-data' : i % 23 === 0 ? 'duplicate' : null,
        deletedAt: null,
        createdAt: new Date(Date.now() - i * 86400000).toISOString(),
        updatedAt: new Date().toISOString(),
      }
      this.contacts.set(id, contact)
    }
  }

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
        serviceType: primary.serviceType,
        jobTitle: primary.jobTitle,
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

  private _activeDuplicatePairs(): DuplicatePair[] {
    const pairs: DuplicatePair[] = []
    for (const pair of this.duplicatePairs.values()) {
      if (pair.resolvedAt) continue
      const primary = this.contacts.get(pair.primaryId)
      const duplicate = this.contacts.get(pair.duplicateId)
      if (!primary || !duplicate || primary.deletedAt || duplicate.deletedAt) continue
      pairs.push({ id: pair.id, primary, duplicate, matchScore: pair.matchScore, matchReasons: pair.matchReasons })
    }
    return pairs
  }

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

  private _sortValue(contact: Contact, sortBy: string): string | number {
    switch (sortBy) {
      case 'name': return contact.name.toLowerCase()
      case 'email': return (contact.email ?? '').toLowerCase()
      case 'phone': return contact.phone ?? ''
      case 'serviceType': return (contact.serviceType ?? '').toLowerCase()
      case 'city': return (contact.city ?? '').toLowerCase()
      case 'company': return (contact.company ?? '').toLowerCase()
      case 'createdAt': return new Date(contact.createdAt).getTime()
      default: return new Date(contact.createdAt).getTime()
    }
  }

  async findAll(params: PaginationParams, filters?: ContactFilters): Promise<{ data: Contact[]; total: number }> {
    let data = Array.from(this.contacts.values()).filter(c => c.deletedAt === null)

    if (filters?.serviceType) {
      const st = filters.serviceType.toLowerCase()
      data = data.filter(c => (c.serviceType ?? '').toLowerCase() === st)
    }
    if (filters?.city) {
      const cityQuery = filters.city.toLowerCase()
      data = data.filter(c => (c.city ?? '').toLowerCase().includes(cityQuery))
    }
    if (filters?.jobTitle) {
      const jt = filters.jobTitle.toLowerCase()
      data = data.filter(c => (c.jobTitle ?? '').toLowerCase().includes(jt))
    }
    if (filters?.flagCategory === 'ANY') data = data.filter(c => c.flagCategory !== null)
    else if (filters?.flagCategory === 'NONE') data = data.filter(c => c.flagCategory === null)
    else if (filters?.flagCategory) data = data.filter(c => c.flagCategory === filters.flagCategory)
    
    if (filters?.consentStatus) data = data.filter(c => c.consentStatus === filters.consentStatus)
    if (filters?.missingEmail) data = data.filter(c => c.email === null)
    if (filters?.missingPhone) data = data.filter(c => c.phone === null)

    if (filters?.serviceTypes?.length) data = data.filter(c => c.serviceType && filters.serviceTypes!.includes(c.serviceType))
    if (filters?.cities?.length) data = data.filter(c => c.city && filters.cities!.includes(c.city))
    if (filters?.jobTitles?.length) {
      const lowerJobTitles = filters.jobTitles.map(j => j.toLowerCase())
      data = data.filter(c => c.jobTitle && lowerJobTitles.includes(c.jobTitle.toLowerCase()))
    }

    if (filters?.search) {
      const q = filters.search.toLowerCase()
      data = data.filter(c =>
        c.name.toLowerCase().includes(q) ||
        (c.phone ?? '').includes(q) ||
        (c.email ?? '').toLowerCase().includes(q) ||
        (c.company ?? '').toLowerCase().includes(q),
      )
    }

    data = this._sort(data, params)
    const total = data.length
    const start = (Math.max(1, params.page) - 1) * params.pageSize
    return { data: data.slice(start, start + params.pageSize), total }
  }

  async findById(id: EntityId): Promise<Contact | null> {
    return this.contacts.get(id) ?? null
  }

  async findByPhone(phone: string | null): Promise<Contact | null> {
    if (!phone) return null
    return Array.from(this.contacts.values())
      .filter(c => c.deletedAt === null)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .find(c => c.phone === phone) ?? null
  }

  async findDuplicates(params: PaginationParams): Promise<{ data: DuplicatePair[]; total: number }> {
    const data = this._activeDuplicatePairs()
    const total = data.length
    const start = (params.page - 1) * params.pageSize
    return { data: data.slice(start, start + params.pageSize), total }
  }

  async dismissDuplicate(id: EntityId): Promise<boolean> {
    const pair = this.duplicatePairs.get(id)
    if (!pair || pair.resolvedAt) return false
    pair.resolvedAt = new Date().toISOString()
    return true
  }

  async mergeDuplicate(primaryId: EntityId, fieldSelections?: Record<string, DuplicateFieldChoice>): Promise<Contact | null> {
    const primary = this.contacts.get(primaryId)
    if (!primary) return null

    // Find the pair
    const pairEntry = Array.from(this.duplicatePairs.entries()).find(
      ([_, p]) => (p.primaryId === primaryId || p.duplicateId === primaryId) && p.resolvedAt === null
    )
    if (!pairEntry) return primary

    const [pairId, pair] = pairEntry
    const otherId = pair.primaryId === primaryId ? pair.duplicateId : pair.primaryId
    const other = this.contacts.get(otherId)
    
    const MERGEABLE_FIELDS = ['name', 'email', 'phone', 'city', 'company', 'department', 'serviceType', 'jobTitle', 'eventDate'] as const
    type MergeableField = typeof MERGEABLE_FIELDS[number]

    if (other && fieldSelections) {
      for (const field of MERGEABLE_FIELDS) {
        if (fieldSelections[field] === 'duplicate') {
          (primary as Record<MergeableField, unknown>)[field] = other[field]
        }
      }
    }

    // Mark as resolved
    pair.resolvedAt = new Date().toISOString()
    this.duplicatePairs.set(pairId, pair)
    
    // Remove the 'other' contact if it was the duplicate
    if (otherId !== primaryId) {
      this.contacts.delete(otherId)
    }

    return primary
  }

  async createDuplicatePair(data: Omit<DuplicatePair, 'id' | 'resolvedAt'>): Promise<void> {
    const id = createId()
    this.duplicatePairs.set(id, {
      id,
      primaryId: data.primary.id,
      duplicateId: data.duplicate.id,
      matchScore: data.matchScore,
      matchReasons: data.matchReasons,
      resolvedAt: null,
    })
  }

  async upsert(data: Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>): Promise<Contact> {
    // Detect collision: phone first (stronger signal), then email
    let existingMatch: Contact | null = null
    let matchReasons: DuplicateMatchReason[] = []

    if (data.phone) {
      const byPhone = await this.findByPhone(data.phone)
      if (byPhone) {
        existingMatch = byPhone
        matchReasons = ['same_phone']
      }
    }

    if (!existingMatch && data.email) {
      const byEmail = Array.from(this.contacts.values()).find(
        c => c.email?.toLowerCase() === data.email?.toLowerCase() && c.deletedAt === null
      )
      if (byEmail) {
        existingMatch = byEmail
        matchReasons = ['same_email']
      }
    }

    const flagCategory = existingMatch ? 'duplicate' as const : (data.flagCategory ?? null)
    const newId = createId()

    const newContact: Contact = {
      ...data,
      id: newId,
      flagCategory,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    this.contacts.set(newId, newContact)

    // Register duplicate pair if collision found
    if (existingMatch) {
      const matchScore = matchReasons.includes('same_phone') ? 0.95 : 0.85
      const pairId = createId()
      this.duplicatePairs.set(pairId, {
        id: pairId,
        primaryId: existingMatch.id,
        duplicateId: newId,
        matchScore,
        matchReasons,
        resolvedAt: null,
      })
    }

    return newContact
  }

  async update(id: EntityId, data: Partial<Contact>): Promise<Contact | null> {
    const contact = this.contacts.get(id)
    if (!contact) return null
    const updated = { ...contact, ...data, updatedAt: new Date().toISOString() }
    this.contacts.set(id, updated)
    return updated
  }

  async softDelete(id: EntityId): Promise<void> {
    const contact = this.contacts.get(id)
    if (contact) {
      contact.deletedAt = new Date().toISOString()
      this.contacts.set(id, contact)
    }
  }

  async countHealth(): Promise<{ flagged: number; duplicates: number; missingEmail: number; missingPhone: number }> {
    const all = Array.from(this.contacts.values()).filter(c => c.deletedAt === null)
    return {
      flagged: all.filter(c => c.flagCategory !== null).length,
      duplicates: this._activeDuplicatePairs().length,
      missingEmail: all.filter(c => c.email === null).length,
      missingPhone: all.filter(c => c.phone === null).length,
    }
  }

  async findFacets(): Promise<FacetResult> {
    const all = Array.from(this.contacts.values()).filter(c => c.deletedAt === null)
    
    const serviceTypeMap = new Map<string, number>()
    const cityMap = new Map<string, number>()

    all.forEach(c => {
      if (c.serviceType) {
        serviceTypeMap.set(c.serviceType, (serviceTypeMap.get(c.serviceType) ?? 0) + 1)
      }
      if (c.city) {
        cityMap.set(c.city, (cityMap.get(c.city) ?? 0) + 1)
      }
    })

    return {
      serviceType: Array.from(serviceTypeMap.entries()).map(([name, count]) => ({
        slug: name.toLowerCase().replace(/\s+/g, '-'),
        label: name,
        count
      })),
      city: Array.from(cityMap.entries()).map(([name, count]) => ({
        slug: name.toLowerCase().replace(/\s+/g, '-'),
        label: name,
        count
      }))
    }
  }

  async anonymize(id: EntityId, hashedPhone: string): Promise<void> {
    const contact = this.contacts.get(id)
    if (contact) {
      contact.phone = hashedPhone
      contact.email = null
      contact.name = 'Anonymized'
      contact.consentStatus = 'suppressed'
      this.contacts.set(id, contact)
    }
  }

  async existsByPhoneHash(hashedPhone: string): Promise<boolean> {
    return Array.from(this.contacts.values()).some(c => c.phone === hashedPhone)
  }
}
