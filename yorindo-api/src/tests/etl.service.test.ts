import { describe, it, expect, vi, beforeEach } from 'vitest'
import { writeFile, unlink } from 'fs/promises'
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
import { computeCompletenessScore } from '../services/etl.service.js'

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
    companySize: '50-200',
    industrySlug: 'teknologi',
    jobTitleSlug: 'manajer',
    confidence: 0.9,
    flags: [],
    provinceCode: '31',
    provinceName: 'DKI Jakarta',
    cityCode: '31.71',
    cityName: 'Jakarta Pusat',
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
      { 'Nama Lengkap': 'John Doe', 'No HP / Handphone': '081234567890', Email: 'John@Example.com', 'Jenis Industri': 'teknologi', Jabatan: 'manager' },
      { 'Nama Lengkap': 'Jane Doe', 'No HP / Handphone': '081234567891', Email: 'Jane@Example.com', 'Jenis Industri': 'teknologi', Jabatan: 'manager' },
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
    expect((await contactRepo.findAll({ page: 1, pageSize: 200 })).total).toBe(122)
    expect((await registrationRepo.findAll({ page: 1, pageSize: 200 }, { eventId: 'event-1' })).total).toBeGreaterThan(0)
  })

  it('creates flagged records for low-confidence rows without touching contacts', async () => {
    const filePath = await createTempXlsx([
      { 'Nama Lengkap': 'No Phone' },
      { 'Nama Lengkap': 'Low Confidence' },
    ])

    const service = new EtlService(
      contactRepo,
      flaggedRepo,
      rawUploadRepo,
      auditLogRepo,
      registrationRepo,
      makeNormalizer((rows) => rows.map(() => buildRow({
        phone: '+620000000000',
        email: null,
        confidence: 0.4,
        flags: ['invalid_phone'],
      }))),
      makeDeduplicator(),
    )

    const result = await service.processFile(filePath, 'user-1')

    expect(result.upserted).toBe(0)
    expect(result.flagged).toBe(2)
    expect((await contactRepo.findAll({ page: 1, pageSize: 200 })).total).toBe(120)
    expect((await flaggedRepo.findAll({ page: 1, pageSize: 100 })).total).toBe(22)
  })

  it('coerces invalid optional fields to null and still upserts the contact', async () => {
    const filePath = await createTempXlsx([
      { 'Nama Lengkap': 'Optional Fields', 'No HP / Handphone': '081234567890', Email: 'bad email', 'Tanggal Acara': 'tanggal-rusak' },
    ])

    const service = new EtlService(
      contactRepo,
      flaggedRepo,
      rawUploadRepo,
      auditLogRepo,
      registrationRepo,
      makeNormalizer(() => [buildRow({
        email: 'not-an-email',
        companySize: 'gigantic',
        eventDate: '31/03/2026',
        confidence: 0.9,
      })]),
      makeDeduplicator(),
    )

    const result = await service.processFile(filePath, 'user-1')
    expect(result).toEqual({ processed: 1, upserted: 1, flagged: 0, failed: 0 })

    const contact = await contactRepo.findByPhone('+6281234567890')
    expect(contact).not.toBeNull()
    expect(contact?.email).toBeNull()
    expect(contact?.companySize).toBeNull()
  })

  it('flags rows with invalid required fields instead of failing the whole batch', async () => {
    const filePath = await createTempXlsx([
      { 'Nama Lengkap': '', 'No HP / Handphone': 'abcd' },
      { 'Nama Lengkap': 'Valid Contact', 'No HP / Handphone': '081234567891' },
    ])

    const service = new EtlService(
      contactRepo,
      flaggedRepo,
      rawUploadRepo,
      auditLogRepo,
      registrationRepo,
      makeNormalizer(() => [
        buildRow({ name: '', phone: 'invalid-phone', confidence: 0.95 }),
        buildRow({ name: 'Valid Contact', phone: '+6281234567891', confidence: 0.95 }),
      ]),
      makeDeduplicator(),
    )

    const result = await service.processFile(filePath, 'user-1')

    expect(result).toEqual({ processed: 2, upserted: 1, flagged: 1, failed: 0 })
    expect(await contactRepo.findByPhone('+6281234567891')).not.toBeNull()
  })

  it('retries batch normalization and succeeds on the third attempt', async () => {
    const filePath = await createTempXlsx([{ 'Nama Lengkap': 'Retry', 'No HP / Handphone': '081234567890' }])
    let attempts = 0
    const normalizer: IEtlNormalizationService = {
      async normalizeBatch(): Promise<NormalizedRow[]> {
        attempts++
        if (attempts < 3) throw new Error('transient normalization failure')
        return [buildRow()]
      },
    }

    vi.spyOn(global, 'setTimeout').mockImplementation((handler: TimerHandler) => {
      if (typeof handler === 'function') handler()
      return 0 as ReturnType<typeof setTimeout>
    })

    try {
      const service = new EtlService(
        contactRepo,
        flaggedRepo,
        rawUploadRepo,
        auditLogRepo,
        registrationRepo,
        normalizer,
        makeDeduplicator(),
      )

      const result = await service.processFile(filePath, 'user-1')
      expect(result.failed).toBe(0)
      expect(result.upserted).toBe(1)
      expect(attempts).toBe(3)
    } finally {
      vi.restoreAllMocks()
    }
  })

  it('computes completeness score with the 8-field formula', () => {
    expect(computeCompletenessScore(buildRow())).toBe(1)
    expect(computeCompletenessScore(buildRow({
      email: null,
      companySize: null,
    }))).toBe(0.75)
  })

  it('deletes the temporary file after processing', async () => {
    const filePath = await createTempXlsx([{ 'Nama Lengkap': 'Delete Me', 'No HP / Handphone': '081234567890' }])

    const service = new EtlService(
      contactRepo,
      flaggedRepo,
      rawUploadRepo,
      auditLogRepo,
      registrationRepo,
      makeNormalizer(() => [buildRow()]),
      makeDeduplicator(),
    )

    await service.processFile(filePath, 'user-1')
    await expect(unlink(filePath)).rejects.toThrow()
  })
})
