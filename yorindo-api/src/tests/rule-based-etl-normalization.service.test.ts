import { describe, expect, it } from 'vitest'
import { RuleBasedEtlNormalizationService } from '../services/adapters/real/RuleBasedEtlNormalizationService.js'

describe('RuleBasedEtlNormalizationService', () => {
  const service = new RuleBasedEtlNormalizationService()

  it('maps exact city names to wilayah codes', () => {
    const result = service.mapCityToCode('Surabaya')
    expect(result.provinceCode).toBe('35')
    expect(result.cityCode).toBe('35.78')
  })

  it('maps fuzzy city names when similarity is high enough', () => {
    const result = service.mapCityToCode('Surabaya')
    expect(result.cityCode).toBe('35.78')
  })

  it('maps configured aliases', () => {
    const result = service.mapCityToCode('jkt')
    expect(result.provinceCode).toBe('31')
    expect(result.cityCode).toBe('31.71')
  })

  it('returns null codes when there is no city match', () => {
    const result = service.mapCityToCode('Atlantis')
    expect(result.cityCode).toBeNull()
    expect(result.provinceCode).toBeNull()
  })
})
