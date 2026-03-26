import { describe, it, expect, vi, beforeEach } from 'vitest'
import { writeFile, unlink } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import * as XLSX from 'xlsx'
import { EtlService } from '../services/etl.service.js'
import { InMemoryContactRepository } from '../repositories/memory/ContactRepository.js'
import { InMemoryFlaggedRecordsRepository } from '../repositories/memory/FlaggedRecordsRepository.js'
import { InMemoryRawUploadRepository } from '../repositories/memory/RawUploadRepository.js'
import { InMemoryAuditLogRepository } from '../repositories/memory/AuditLogRepository.js'
import type { IEtlNormalizationService, RawContactRow, NormalizedRow } from '../interfaces/services/IEtlNormalizationService.js'

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function createTempXlsx(rows: object[]): Promise<string> {
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  const filePath = join(tmpdir(), `etl-test-${Date.now()}.xlsx`)
  await writeFile(filePath, buffer)
  return filePath
}

function makeHighConfidenceNormalizer(): IEtlNormalizationService {
  return {
    async normalizeBatch(rows: RawContactRow[]): Promise<NormalizedRow[]> {
      return rows.map((_, i) => ({
        name: `Contact ${i}`,
        phone: `+6281234${String(i).padStart(6, '0')}`,
        email: `contact${i}@example.com`,
        city: 'Jakarta',
        company: 'PT Test',
        companySize: '50-200',
        industrySlug: 'teknologi',
        jobTitleSlug: null,
        confidence: 0.9,
        flags: [],
      }))
    },
  }
}

function makeLowConfidenceNormalizer(): IEtlNormalizationService {
  return {
    async normalizeBatch(rows: RawContactRow[]): Promise<NormalizedRow[]> {
      return rows.map((_, i) => ({
        name: `Flagged ${i}`,
        phone: `+6281111${String(i).padStart(6, '0')}`,
        email: null,
        city: null,
        company: null,
        companySize: null,
        industrySlug: null,
        jobTitleSlug: null,
        confidence: 0.4,
        flags: ['low_confidence', 'missing_email'],
      }))
    },
  }
}

function makeRetryNormalizer(failTimes: number): IEtlNormalizationService {
  let callCount = 0
  return {
    async normalizeBatch(rows: RawContactRow[]): Promise<NormalizedRow[]> {
      callCount++
      if (callCount <= failTimes) {
        throw new Error('JSON parse error simulation')
      }
      return rows.map((_, i) => ({
        name: `Contact ${i}`,
        phone: `+6282222${String(i).padStart(6, '0')}`,
        email: null,
        city: null,
        company: null,
        companySize: null,
        industrySlug: null,
        jobTitleSlug: null,
        confidence: 0.8,
        flags: [],
      }))
    },
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('EtlService', () => {
  let contactRepo: InMemoryContactRepository
  let flaggedRepo: InMemoryFlaggedRecordsRepository
  let rawUploadRepo: InMemoryRawUploadRepository
  let auditLogRepo: InMemoryAuditLogRepository
  const initialContactCount = 247
  const initialFlaggedCount = 10

  beforeEach(() => {
    contactRepo = new InMemoryContactRepository()
    flaggedRepo = new InMemoryFlaggedRecordsRepository()
    rawUploadRepo = new InMemoryRawUploadRepository()
    auditLogRepo = new InMemoryAuditLogRepository()
  })

  it('upserts high-confidence rows into contacts', async () => {
    const rowData = Array.from({ length: 5 }, (_, i) => ({ name: `Test ${i}`, phone: `0812345${i}` }))
    const filePath = await createTempXlsx(rowData)

    const svc = new EtlService(contactRepo, flaggedRepo, rawUploadRepo, auditLogRepo, makeHighConfidenceNormalizer(), 50)
    const result = await svc.processFile(filePath, 'user-1')

    expect(result.processed).toBe(5)
    expect(result.upserted).toBe(5)
    expect(result.flagged).toBe(0)

    const { total } = await contactRepo.findAll({ page: 1, pageSize: 200 })
    expect(total).toBe(initialContactCount + 5)
  })

  it('creates flagged_records for low-confidence rows', async () => {
    const rowData = Array.from({ length: 3 }, (_, i) => ({ name: `Low ${i}` }))
    const filePath = await createTempXlsx(rowData)

    const svc = new EtlService(contactRepo, flaggedRepo, rawUploadRepo, auditLogRepo, makeLowConfidenceNormalizer(), 50)
    const result = await svc.processFile(filePath, 'user-1')

    expect(result.upserted).toBe(0)
    expect(result.flagged).toBe(3)

    const { total: contactTotal } = await contactRepo.findAll({ page: 1, pageSize: 200 })
    expect(contactTotal).toBe(initialContactCount)  // no new contacts

    const { total: flaggedTotal } = await flaggedRepo.findAll({ page: 1, pageSize: 100 })
    expect(flaggedTotal).toBe(initialFlaggedCount + 3)
  })

  it('retries on failure — succeeds on 3rd attempt', async () => {
    const rowData = [{ name: 'Retry Test', phone: '081234567890' }]
    const filePath = await createTempXlsx(rowData)

    // Override setTimeout to avoid real delays in tests
    const originalSetTimeout = global.setTimeout
    vi.spyOn(global, 'setTimeout').mockImplementation((fn: TimerHandler) => {
      if (typeof fn === 'function') fn()
      return 0 as unknown as ReturnType<typeof setTimeout>
    })

    try {
      const svc = new EtlService(contactRepo, flaggedRepo, rawUploadRepo, auditLogRepo, makeRetryNormalizer(2), 50)
      const result = await svc.processFile(filePath, 'user-1')
      expect(result.upserted).toBe(1)
      expect(result.failed).toBe(0)
    } finally {
      vi.restoreAllMocks()
      // Restore original setTimeout
      global.setTimeout = originalSetTimeout
    }
  })

  it('counts failed rows when all retries exhausted', async () => {
    const rowData = Array.from({ length: 3 }, (_, i) => ({ name: `Fail ${i}` }))
    const filePath = await createTempXlsx(rowData)

    const alwaysFailNormalizer: IEtlNormalizationService = {
      async normalizeBatch() { throw new Error('Always fails') },
    }

    vi.spyOn(global, 'setTimeout').mockImplementation((fn: TimerHandler) => {
      if (typeof fn === 'function') fn()
      return 0 as unknown as ReturnType<typeof setTimeout>
    })

    try {
      const svc = new EtlService(contactRepo, flaggedRepo, rawUploadRepo, auditLogRepo, alwaysFailNormalizer, 50)
      const result = await svc.processFile(filePath, 'user-1')
      expect(result.failed).toBe(3)
    } finally {
      vi.restoreAllMocks()
    }
  })

  it('computes completeness_score correctly', async () => {
    const rowData = [{ name: 'Full Contact', phone: '081234567890' }]
    const filePath = await createTempXlsx(rowData)

    const fullFieldsNormalizer: IEtlNormalizationService = {
      async normalizeBatch(): Promise<NormalizedRow[]> {
        return [{
          name: 'Full Contact',
          phone: '+6281234567890',
          email: 'full@example.com',
          city: 'Jakarta',
          company: 'PT Full',
          companySize: '50-200',
          industrySlug: 'teknologi',
          jobTitleSlug: 'software-engineer',
          confidence: 0.95,
          flags: [],
        }]
      },
    }

    const svc = new EtlService(contactRepo, flaggedRepo, rawUploadRepo, auditLogRepo, fullFieldsNormalizer, 50)
    await svc.processFile(filePath, 'user-1')

    const contact = await contactRepo.findByPhone('+6281234567890')
    expect(contact).not.toBeNull()
    expect(contact!.completenessScore).toBe(1.0)  // All 8 fields present
  })

  it('deletes temp file after processing', async () => {
    const rowData = [{ name: 'Test', phone: '081111111111' }]
    const filePath = await createTempXlsx(rowData)

    const svc = new EtlService(contactRepo, flaggedRepo, rawUploadRepo, auditLogRepo, makeHighConfidenceNormalizer(), 50)
    await svc.processFile(filePath, 'user-1')

    // File should be deleted
    await expect(unlink(filePath)).rejects.toThrow()
  })
})
