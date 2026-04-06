import { describe, expect, it } from 'vitest'
import { RuleBasedEtlNormalizationService } from '../services/adapters/real/RuleBasedEtlNormalizationService.js'

describe('RuleBasedEtlNormalizationService', () => {
  const service = new RuleBasedEtlNormalizationService()

  it('normalizes names and other strings to Title Case', async () => {
    const rows = [
      { name: 'john doe', city: 'jakarta pusat', company: 'pt teknology utama' }
    ]
    const results = await service.normalizeBatch(rows)

    expect(results[0].name).toBe('John Doe')
    expect(results[0].city).toBe('Jakarta Pusat')
    expect(results[0].company).toBe('Pt Teknology Utama')
  })

  it('maps known city names to wilayah codes', async () => {
    const rows = [
      { name: 'John', city: 'Jakarta Pusat' },
      { name: 'Jane', city: 'surabaya' },
      { name: 'Bob', city: 'unknown-city-xyz' },
    ]
    const results = await service.normalizeBatch(rows)

    expect(results[0].provinceCode).toBe('31')
    expect(results[0].cityCode).toBe('31.71')
    expect(results[0].provinceName).toBe('DKI Jakarta')

    expect(results[1].provinceCode).toBe('35')
    expect(results[1].cityCode).toBe('35.78')

    expect(results[2].provinceCode).toBe(null)
    expect(results[2].cityCode).toBe(null)
  })

  it('correctly normalizes phone numbers', async () => {
    const rows = [
      { name: 'John', phone: '08123456789' }
    ]
    const results = await service.normalizeBatch(rows)
    expect(results[0].phone).toBe('+628123456789')
  })

  it('flags missing names with lower confidence', async () => {
    const rows = [
      { name: '', phone: '08123456789' }
    ]
    const results = await service.normalizeBatch(rows)
    expect(results[0].name).toBe('Unknown')
    expect(results[0].flags).toContain('missing_name')
    expect(results[0].confidence).toBeLessThan(0.7)
  })

  it('flags missing phones with lower confidence', async () => {
    const rows = [
      { name: 'John', phone: '' }
    ]
    const results = await service.normalizeBatch(rows)
    expect(results[0].phone).toBe(null)
    expect(results[0].flags).toContain('missing_phone')
    expect(results[0].confidence).toBeLessThan(0.7)
  })

  it('handles serviceType and jobTitle correctly', async () => {
    const rows = [
      { name: 'John', industry: 'TEKNOLOGI', jobTitle: 'MANAGER' }
    ]
    const results = await service.normalizeBatch(rows)
    expect(results[0].serviceType).toBe('Teknologi')
    expect(results[0].jobTitle).toBe('Manager')
  })
})
