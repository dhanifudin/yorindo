import { faker } from '@faker-js/faker'
import type { IContactRepository, PaginationParams, ContactFilters } from '../../interfaces/repositories/IContactRepository.js'
import type { Contact, FacetResult } from '../../types/domain.js'

faker.seed(42)

const INDONESIAN_CITIES = ['Jakarta', 'Surabaya', 'Bandung', 'Medan', 'Semarang', 'Makassar', 'Yogyakarta', 'Palembang', 'Tangerang', 'Depok']
const COMPANY_SIZES = ['<50', '50-200', '200-1000', '>1000'] as const
const INDUSTRY_SLUGS = ['teknologi', 'kesehatan', 'manufaktur', 'keuangan', 'pendidikan', 'retail', 'properti', 'otomotif', 'energi', 'telekomunikasi']
const FLAG_CATEGORIES = [null, null, null, null, 'spam', 'not-potential'] as const

export class InMemoryContactRepository implements IContactRepository {
  private contacts: Map<string, Contact> = new Map()

  constructor() {
    this._seed()
  }

  /**
   * Menyiapkan data kontak deterministik untuk dev dan test tanpa DB sungguhan.
   */
  private _seed(): void {
    for (let i = 0; i < 247; i++) {
      const id = crypto.randomUUID()
      const industryId = INDUSTRY_SLUGS[i % INDUSTRY_SLUGS.length]!
      const city = INDONESIAN_CITIES[i % INDONESIAN_CITIES.length]!
      const companySize = COMPANY_SIZES[i % COMPANY_SIZES.length]!
      const flagCategory = FLAG_CATEGORIES[i % FLAG_CATEGORIES.length]!
      const contact: Contact = {
        id,
        name: faker.person.fullName(),
        phone: `+6281${faker.number.int({ min: 100000000, max: 999999999 })}`,
        email: i % 5 === 0 ? null : faker.internet.email(),
        industryId: i % 3 === 0 ? null : industryId,
        jobTitleId: null,
        city,
        company: faker.company.name(),
        companySize,
        source: 'excel_upload',
        completenessScore: Math.round((0.5 + (i % 5) * 0.1) * 1000) / 1000,
        consentStatus: i % 10 === 0 ? 'suppressed' : 'legacy_unverified',
        flagCategory,
        deletedAt: null,
        createdAt: new Date(Date.now() - i * 86400000).toISOString(),
        updatedAt: new Date().toISOString(),
      }
      this.contacts.set(id, contact)
    }
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

    if (filters?.industry) data = data.filter(c => c.industryId === filters.industry)
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

  async upsert(data: Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>): Promise<Contact> {
    const existing = Array.from(this.contacts.values()).find(c => c.phone === data.phone)
    if (existing) {
      const updated: Contact = { ...existing, ...data, updatedAt: new Date().toISOString() }
      this.contacts.set(existing.id, updated)
      return updated
    }
    const contact: Contact = {
      id: crypto.randomUUID(),
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
      industries: Array.from(industryMap.entries()).map(([id, count]) => ({ id, name: id, count })),
      cities: Array.from(cityMap.entries()).map(([city, count]) => ({ city, count })),
      companySizes: Array.from(sizeMap.entries()).map(([size, count]) => ({ size, count })),
    }
  }
}
