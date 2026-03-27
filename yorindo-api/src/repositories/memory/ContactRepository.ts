import { faker } from '@faker-js/faker'
import { createId } from '@paralleldrive/cuid2'
import type { IContactRepository, PaginationParams, ContactFilters } from '../../interfaces/repositories/IContactRepository.js'
import type { Contact, FacetResult } from '../../types/domain.js'
import { SEED_CONTACT_IDS, INDONESIAN_INDUSTRIES, INDONESIAN_JOB_TITLES } from './_seeds.js'

faker.seed(42)

const INDONESIAN_CITIES = ['Jakarta', 'Bandung', 'Surabaya', 'Medan', 'Yogyakarta', 'Semarang', 'Makassar', 'Palembang', 'Denpasar', 'Balikpapan']
const COMPANY_SIZES = ['<50', '50-200', '200-1000', '>1000'] as const
const SOURCES = ['excel_upload', 'excel_upload', 'excel_upload', 'form', 'manual'] as const

// Consent distribution: ~80% active, ~14% legacy_unverified, ~6% suppressed
function consentStatus(i: number) {
  if (i >= 115) return 'suppressed' as const
  if (i % 7 === 0) return 'legacy_unverified' as const
  return 'active' as const
}

export class InMemoryContactRepository implements IContactRepository {
  private contacts: Map<string, Contact> = new Map()

  constructor() {
    this._seed()
  }

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

  async findAll(params: PaginationParams, filters?: ContactFilters): Promise<{ data: Contact[]; total: number }> {
    let data = Array.from(this.contacts.values()).filter(c => c.deletedAt === null)

    if (filters?.city) data = data.filter(c => c.city === filters.city)
    if (filters?.companySize) data = data.filter(c => c.companySize === filters.companySize)
    if (filters?.flagCategory) data = data.filter(c => c.flagCategory === filters.flagCategory)
    if (filters?.consentStatus) data = data.filter(c => c.consentStatus === filters.consentStatus)
    if (filters?.missingEmail) data = data.filter(c => c.email === null)
    if (filters?.search) {
      const q = filters.search.toLowerCase()
      data = data.filter(c => c.name.toLowerCase().includes(q) || c.phone.includes(q))
    }

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
      duplicates: 0,
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

  async findFacets(): Promise<FacetResult> {
    const all = Array.from(this.contacts.values()).filter(c => c.deletedAt === null)
    const cityMap = new Map<string, number>()
    const sizeMap = new Map<string, number>()

    for (const c of all) {
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
