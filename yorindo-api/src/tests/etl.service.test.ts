import { describe, it, expect, vi, beforeEach } from 'vitest'
import { writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import * as XLSX from 'xlsx'
import { EtlService } from '../services/etl.service.js'
import { InMemoryAuditLogRepository } from '../repositories/memory/AuditLogRepository.js'
import { InMemoryContactRepository } from '../repositories/memory/ContactRepository.js'
import { InMemoryFlaggedRecordsRepository } from '../repositories/memory/FlaggedRecordsRepository.js'
import { InMemoryRawUploadRepository } from '../repositories/memory/RawUploadRepository.js'
import { InMemoryRegistrationRepository } from '../repositories/memory/RegistrationRepository.js'
import type { IDeduplicationService } from '../interfaces/services/IDeduplicationService.js'
import type { IEtlNormalizationService, NormalizedRow, RawContactRow } from '../interfaces/services/IEtlNormalizationService.js'

async function createTempXlsx(rows: object[]): Promise<string> {
  const sheet = XLSX.utils.json_to_sheet(rows)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, 'Sheet1')
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
  const filePath = join(tmpdir(), `etl-service-${Date.now()}-${Math.random()}.xlsx`)
  await writeFile(filePath, buffer)
  return filePath
}

function buildRow(overrides: Partial<NormalizedRow> = {}): NormalizedRow {
  return {
    name: 'John Doe',
    phone: '+6281234567890',
    email: 'john@example.com',
    city: 'Jakarta',
    company: 'PT Test',
    department: 'Sales',
    serviceType: 'Teknologi',
    jobTitle: 'Manajer',
    confidence: 0.9,
    flags: [],
    provinceCode: null,
    provinceName: null,
    cityCode: null,
    cityName: 'Jakarta',
    eventDate: '2026-03-31',
    eventNameRaw: 'Yorindo Summit',
    ...overrides,
  }
}

function makeNormalizer(factory: (rows: RawContactRow[]) => NormalizedRow[]): IEtlNormalizationService {
  return {
    async normalizeBatch(rows: RawContactRow[]): Promise<NormalizedRow[]> {
      return factory(rows)
    },
  }
}

function makeDeduplicator(): IDeduplicationService {
  return {
    async findPotentialDuplicates(): Promise<void> {},
  }
}

describe('EtlService', () => {
  let contactRepo: InMemoryContactRepository
  let flaggedRepo: InMemoryFlaggedRecordsRepository
  let rawUploadRepo: InMemoryRawUploadRepository
  let auditLogRepo: InMemoryAuditLogRepository
  let registrationRepo: InMemoryRegistrationRepository

  beforeEach(() => {
    contactRepo = new InMemoryContactRepository()
    flaggedRepo = new InMemoryFlaggedRecordsRepository()
    rawUploadRepo = new InMemoryRawUploadRepository()
    auditLogRepo = new InMemoryAuditLogRepository()
    registrationRepo = new InMemoryRegistrationRepository()
  })

  it('upserts high-confidence rows and creates registrations when eventId is provided', async () => {
    const filePath = await createTempXlsx([
      { 'Nama Lengkap': 'John Doe', 'No HP / Handphone': '081234567890', Email: 'John@Example.com', 'Jenis Industri': 'Teknologi', Jabatan: 'Manager' },
      { 'Nama Lengkap': 'Jane Doe', 'No HP / Handphone': '081234567891', Email: 'Jane@Example.com', 'Jenis Industri': 'Teknologi', Jabatan: 'Manager' },
    ])

    const service = new EtlService(
      contactRepo,
      flaggedRepo,
      rawUploadRepo,
      auditLogRepo,
      registrationRepo,
      makeNormalizer((rows) => rows.map((_, index) => buildRow({
        name: index === 0 ? 'John Doe' : 'Jane Doe',
        phone: `+628123456789${index}`,
        email: index === 0 ? 'john@example.com' : 'jane@example.com',
      }))),
      makeDeduplicator(),
    )

    const result = await service.processFile(filePath, 'user-1', { eventId: 'event-1', uploadSource: 'onsite_import' })

    expect(result).toEqual({ processed: 2, upserted: 2, flagged: 0, failed: 0 })
    
    const john = await contactRepo.findByPhone('+6281234567890')
    expect(john?.name).toBe('John Doe')
    expect(john?.serviceType).toBe('Teknologi')
    expect(john?.jobTitle).toBe('Manajer')

    const { data: registrations } = await registrationRepo.findAll({ page: 1, pageSize: 10 }, { contactId: john!.id })
    expect(registrations).toHaveLength(1)
    expect(registrations[0].eventId).toBe('event-1')
  })

  it('creates flagged records for low-confidence rows without touching contacts', async () => {
    const filePath = await createTempXlsx([
      { 'Nama Lengkap': 'Low Confidence', 'No HP / Handphone': '081200000000' },
    ])

    const service = new EtlService(
      contactRepo,
      flaggedRepo,
      rawUploadRepo,
      auditLogRepo,
      registrationRepo,
      makeNormalizer((rows: RawContactRow[]) => {
        return rows.map(() => {
          const row = buildRow()
          return {
            ...row,
            name: 'Low Confidence',
            phone: '+6281200000000',
            confidence: 0.4,
            flags: ['low_confidence'],
          }
        })
      }),
      makeDeduplicator(),
    )

    const result = await service.processFile(filePath, 'user-1')

    expect(result.upserted).toBe(0)
    expect(result.flagged).toBe(1)

    const flagged = await flaggedRepo.findAll({ page: 1, pageSize: 10 })
    expect(flagged.data[0].flags).toContain('low_confidence')
  })

  it('handles empty files gracefully', async () => {
    const filePath = await createTempXlsx([])
    const service = new EtlService(
      contactRepo,
      flaggedRepo,
      rawUploadRepo,
      auditLogRepo,
      registrationRepo,
      makeNormalizer(() => []),
      makeDeduplicator(),
    )

    const result = await service.processFile(filePath, 'user-1')
    expect(result.processed).toBe(0)
  })
})
