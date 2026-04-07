import { describe, it, expect, beforeEach } from 'vitest'
import { FuzzyDeduplicationService } from '../services/FuzzyDeduplicationService.js'
import { InMemoryContactRepository } from '../repositories/memory/ContactRepository.js'
import { createId } from '@paralleldrive/cuid2'
import type { Contact } from '../types/domain.js'

describe('FuzzyDeduplicationService', () => {
  let contactRepo: InMemoryContactRepository
  let service: FuzzyDeduplicationService

  beforeEach(() => {
    contactRepo = new InMemoryContactRepository()
    service = new FuzzyDeduplicationService(contactRepo)
  })

  it('detects duplicate by exact email', async () => {
    // 1. Create an existing contact
    const existing = await contactRepo.upsert({
      name: 'Original User',
      phone: '+628111111111',
      email: 'duplicate@example.com',
      serviceType: null,
      jobTitle: null,
      city: null,
      provinceCode: null,
      provinceName: null,
      cityCode: null,
      cityName: null,
      company: null,
      department: null,
      eventDate: null,
      source: 'manual',
      completenessScore: 0.5,
      consentStatus: 'active',
      flagCategory: null,
      deletedAt: null,
    })

    // 2. Create another contact first, then update it to HAVE the same email
    // but a different phone, simulating a data-quality issue.
    const tempContact = await contactRepo.upsert({
      name: 'Different Name But Same Email',
      phone: '+628999999999',
      email: 'unique-to-start@example.com',
      serviceType: null,
      jobTitle: null,
      city: null,
      provinceCode: null,
      provinceName: null,
      cityCode: null,
      cityName: null,
      company: null,
      department: null,
      eventDate: null,
      source: 'excel_upload',
      completenessScore: 0.5,
      consentStatus: 'legacy_unverified',
      flagCategory: null,
      deletedAt: null,
    })

    const duplicate = await contactRepo.update(tempContact.id, {
      email: 'duplicate@example.com',
    }) as Contact

    await service.findPotentialDuplicates(duplicate)

    const { data: duplicates } = await contactRepo.findDuplicates({ page: 1, pageSize: 10 })
    expect(duplicates.length).toBeGreaterThan(0)
    const pair = duplicates.find(p => p.duplicate.id === duplicate.id)
    expect(pair).toBeTruthy()
    expect(pair!.matchReasons).toContain('same_email')
    expect(pair!.matchScore).toBe(1.0)
  })

  it('detects duplicate by similar name (Levenshtein)', async () => {
    const existing = await contactRepo.upsert({
      name: 'Budi Santoso',
      phone: '+628111111111',
      email: 'budi@example.com',
      serviceType: null,
      jobTitle: null,
      city: null,
      provinceCode: null,
      provinceName: null,
      cityCode: null,
      cityName: null,
      company: null,
      department: null,
      eventDate: null,
      source: 'manual',
      completenessScore: 0.5,
      consentStatus: 'active',
      flagCategory: null,
      deletedAt: null,
    })

    const duplicate = await contactRepo.upsert({
      name: 'Budi Santos', // One character difference
      phone: null,
      email: null,
      serviceType: null,
      jobTitle: null,
      city: null,
      provinceCode: null,
      provinceName: null,
      cityCode: null,
      cityName: null,
      company: null,
      department: null,
      eventDate: null,
      source: 'excel_upload',
      completenessScore: 0.5,
      consentStatus: 'legacy_unverified',
      flagCategory: null,
      deletedAt: null,
    })

    await service.findPotentialDuplicates(duplicate)

    const { data: duplicates } = await contactRepo.findDuplicates({ page: 1, pageSize: 10 })
    const pair = duplicates.find(p => p.duplicate.id === duplicate.id)
    expect(pair).toBeTruthy()
    expect(pair!.matchReasons).toContain('similar_name')
    expect(pair!.matchScore).toBeGreaterThan(0.9)
  })

  it('does not detect duplicate when similarity is below threshold', async () => {
    const existing = await contactRepo.upsert({
      name: 'John Doe',
      phone: null,
      email: null,
      serviceType: null,
      jobTitle: null,
      city: null,
      provinceCode: null,
      provinceName: null,
      cityCode: null,
      cityName: null,
      company: null,
      department: null,
      eventDate: null,
      source: 'manual',
      completenessScore: 0.5,
      consentStatus: 'active',
      flagCategory: null,
      deletedAt: null,
    })

    const newContact = await contactRepo.upsert({
      name: 'Jane Smith',
      phone: null,
      email: null,
      serviceType: null,
      jobTitle: null,
      city: null,
      provinceCode: null,
      provinceName: null,
      cityCode: null,
      cityName: null,
      company: null,
      department: null,
      eventDate: null,
      source: 'excel_upload',
      completenessScore: 0.5,
      consentStatus: 'legacy_unverified',
      flagCategory: null,
      deletedAt: null,
    })

    await service.findPotentialDuplicates(newContact)

    const { data: duplicates } = await contactRepo.findDuplicates({ page: 1, pageSize: 10 })
    const pair = duplicates.find(p => p.duplicate.id === newContact.id)
    expect(pair).toBeUndefined()
  })
})
