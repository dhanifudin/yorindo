import path from 'node:path'
import * as XLSX from 'xlsx'
import { z } from 'zod'
import type { IAuditLogRepository } from '../interfaces/repositories/IAuditLogRepository.js'
import type { IContactRepository } from '../interfaces/repositories/IContactRepository.js'
import type { IFlaggedRecordsRepository } from '../interfaces/repositories/IFlaggedRecordsRepository.js'
import type { IRawUploadRepository } from '../interfaces/repositories/IRawUploadRepository.js'
import type { IRegistrationRepository } from '../interfaces/repositories/IRegistrationRepository.js'
import type { IDeduplicationService } from '../interfaces/services/IDeduplicationService.js'
import type { IEtlNormalizationService, NormalizedRow, RawContactRow } from '../interfaces/services/IEtlNormalizationService.js'
import { deleteFile, readUploadFile } from '../lib/storage.js'
import { INDONESIAN_INDUSTRIES, INDONESIAN_JOB_TITLES } from '../repositories/memory/_seeds.js'
import type { CompanySize, ContactSource } from '../types/domain.js'

export const NormalizedRowSchema = z.object({
  name: z.string().trim().min(1),
  phone: z.string().regex(/^\+62\d{8,13}$/),
  email: z.string().email().nullable(),
  city: z.string().trim().nullable(),
  company: z.string().trim().nullable(),
  department: z.string().trim().nullable(),
  serviceType: z.string().trim().nullable(),
  jobTitle: z.string().trim().nullable(),
  confidence: z.number().min(0).max(1),
  flags: z.array(z.string()),
  provinceCode: z.string().trim().nullable(),
  provinceName: z.string().trim().nullable(),
  cityCode: z.string().trim().nullable(),
  cityName: z.string().trim().nullable(),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  eventNameRaw: z.string().trim().nullable(),
})

type ValidatedNormalizedRow = z.infer<typeof NormalizedRowSchema>

type UploadSource = 'etl_import' | 'onsite_import'

type PreparedRawRow = RawContactRow & {
  name: string | null
  phone: string | null
  email: string | null
  city: string | null
  company: string | null
  department: string | null
  industryRaw: string | null
  jobTitleRaw: string | null
  companySizeRaw: string | null
  eventDate: string | null
  eventNameRaw: string | null
}

export interface EtlProcessOptions {
  eventId?: string | null
  uploadSource?: UploadSource
  originalFilename?: string | null
}

export interface EtlResult {
  processed: number
  upserted: number
  flagged: number
  failed: number
}

function formatError(error: unknown): Record<string, unknown> {
  if (error instanceof z.ZodError) {
    return {
      type: 'zod_validation_error',
      issues: error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
        code: issue.code,
      })),
    }
  }

  if (error instanceof Error) {
    return {
      type: error.name,
      message: error.message,
      stack: error.stack,
    }
  }

  return {
    type: 'unknown_error',
    value: error,
  }
}

function summarizeBatch(batch: PreparedRawRow[], limit = 3): Array<Record<string, unknown>> {
  return batch.slice(0, limit).map((row, index) => ({
    rowIndex: index,
    name: row.name,
    phone: row.phone,
    email: row.email,
    city: row.city,
    company: row.company,
    industryRaw: row.industryRaw,
    jobTitleRaw: row.jobTitleRaw,
    eventDate: row.eventDate,
    dateParseFlag: row['dateParseFlag'] ?? null,
  }))
}

function summarizeFlaggedRow(row: ValidatedNormalizedRow, rawRow: PreparedRawRow): Record<string, unknown> {
  return {
    name: row.name,
    phone: row.phone,
    email: row.email,
    confidence: row.confidence,
    flags: row.flags,
    city: row.city,
    company: row.company,
    rawCity: rawRow.city,
    rawIndustry: rawRow.industryRaw,
    rawJobTitle: rawRow.jobTitleRaw,
    eventDate: row.eventDate,
    dateParseFlag: rawRow['dateParseFlag'] ?? null,
  }
}

function summarizeInvalidRow(row: NormalizedRow, rawRow: PreparedRawRow, issues: z.ZodIssue[]): Record<string, unknown> {
  return {
    normalized: {
      name: row.name,
      phone: row.phone,
      email: row.email,
      city: row.city,
      company: row.company,
      department: row.department,
      serviceType: row.serviceType,
      jobTitle: row.jobTitle,
      eventDate: row.eventDate,
      eventNameRaw: row.eventNameRaw,
      confidence: row.confidence,
      flags: row.flags,
    },
    raw: {
      name: rawRow.name,
      phone: rawRow.phone,
      email: rawRow.email,
      city: rawRow.city,
      company: rawRow.company,
      department: rawRow.department,
      industryRaw: rawRow.industryRaw,
      jobTitleRaw: rawRow.jobTitleRaw,
      companySizeRaw: rawRow.companySizeRaw,
      eventDate: rawRow.eventDate,
      dateParseFlag: rawRow['dateParseFlag'] ?? null,
    },
    issues: issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
      code: issue.code,
    })),
  }
}

function normalizeText(value: unknown): string | null {
  if (value === null || value === undefined) return null
  const normalized = String(value).trim()
  return normalized ? normalized : null
}

function normalizeEmail(value: unknown): string | null {
  const email = normalizeText(value)?.toLowerCase() ?? null
  if (!email) return null
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null
}

function normalizePhone(value: unknown): string | null {
  const digits = String(value ?? '').replace(/\D/g, '')
  if (!digits) return null
  if (digits.startsWith('0')) return `+62${digits.slice(1)}`
  if (digits.startsWith('62')) return `+${digits}`
  if (digits.startsWith('8')) return `+62${digits}`
  return null
}

function parseEventDate(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null

  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value)
    if (!parsed) return null
    const month = String(parsed.m).padStart(2, '0')
    const day = String(parsed.d).padStart(2, '0')
    return `${parsed.y}-${month}-${day}`
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10)
  }

  const raw = String(value).trim()
  if (!raw) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw

  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toISOString().slice(0, 10)
}

function chunk<T>(items: T[], size: number): T[][] {
  const batches: T[][] = []
  for (let index = 0; index < items.length; index += size) {
    batches.push(items.slice(index, index + size))
  }
  return batches
}

function computeCompletenessScore(row: {
  name: string
  phone: string
  email: string | null
  company: string | null
  serviceType: string | null
  jobTitle: string | null
  city: string | null
  department: string | null
}): number {
  const fields = [
    row.name,
    row.phone,
    row.email,
    row.company,
    row.serviceType,
    row.jobTitle,
    row.city,
    row.department,
  ]
  const nonNull = fields.filter((field) => field !== null && field !== undefined && field !== '').length
  return Math.round((nonNull / fields.length) * 1000) / 1000
}

async function retryWithBackoff<T>(fn: () => Promise<T>, attempts: number, baseDelayMs: number): Promise<T> {
  let lastError: unknown
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      if (attempt < attempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, baseDelayMs * Math.pow(2, attempt)))
      }
    }
  }
  throw lastError
}

function sanitizeNormalizedRow(row: NormalizedRow, fallback: PreparedRawRow): NormalizedRow {
  const sanitizedPhone = normalizePhone(row.phone ?? fallback.phone)
  const sanitizedEmail = normalizeEmail(row.email ?? fallback.email)
  const mergedFlags = [...new Set(row.flags)]
  let confidence = row.confidence
  const normalizedName = normalizeText(row.name ?? fallback.name)
  const normalizedEventDate = parseEventDate(row.eventDate ?? fallback.eventDate)

  if (!sanitizedPhone) {
    mergedFlags.push('invalid_phone')
    confidence = Math.min(confidence, 0.4)
  }

  if ((row.email ?? fallback.email) && !sanitizedEmail) {
    if (!mergedFlags.includes('invalid_email')) mergedFlags.push('invalid_email')
  }

  if (!normalizedName || normalizedName === 'Unknown') {
    if (!mergedFlags.includes('missing_name')) mergedFlags.push('missing_name')
    confidence = Math.min(confidence, 0.4)
  }

  if ((row.eventDate ?? fallback.eventDate) && !normalizedEventDate) {
    if (!mergedFlags.includes('invalid_event_date')) mergedFlags.push('invalid_event_date')
  }

  return {
    ...row,
    name: normalizedName ?? 'Unknown',
    phone: sanitizedPhone ?? '+620000000000',
    email: sanitizedEmail,
    city: normalizeText(row.city ?? fallback.city),
    company: normalizeText(row.company ?? fallback.company),
    department: normalizeText(row.department ?? fallback.department),
    serviceType: normalizeText(row.serviceType),
    jobTitle: normalizeText(row.jobTitle),
    provinceCode: normalizeText(row.provinceCode),
    provinceName: normalizeText(row.provinceName),
    cityCode: normalizeText(row.cityCode),
    cityName: normalizeText(row.cityName),
    eventDate: normalizedEventDate,
    eventNameRaw: normalizeText(row.eventNameRaw ?? fallback.eventNameRaw),
    confidence,
    flags: mergedFlags,
  }
}

function pickFirst(row: RawContactRow, keys: string[]): unknown {
  for (const key of keys) {
    const value = row[key]
    if (value !== null && value !== undefined && value !== '') return value
  }
  return null
}

function prepareRow(row: RawContactRow): PreparedRawRow {
  const eventDate = parseEventDate(pickFirst(row, ['eventDate', 'Tanggal Acara', 'tanggal_acara']))
  const prepared: PreparedRawRow = {
    ...row,
    name: normalizeText(pickFirst(row, ['name', 'Nama Lengkap', 'Nama', 'nama'])),
    phone: normalizePhone(pickFirst(row, ['phone', 'No HP / Handphone', 'No Handphone', 'no_hp', 'telepon', 'phone_number'])),
    email: normalizeEmail(pickFirst(row, ['email', 'Email'])),
    city: normalizeText(pickFirst(row, ['city', 'Asal Kota', 'asal_kota'])),
    company: normalizeText(pickFirst(row, ['company', 'Nama Instansi/Perusahaan', 'Nama Instansi', 'perusahaan'])),
    department: normalizeText(pickFirst(row, ['department', 'Departemen'])),
    industryRaw: normalizeText(pickFirst(row, ['industryRaw', 'Jenis Industri', 'industry', 'industri'])),
    jobTitleRaw: normalizeText(pickFirst(row, ['jobTitleRaw', 'Jabatan', 'job_title', 'position'])),
    companySizeRaw: normalizeText(pickFirst(row, ['companySizeRaw', 'companySize', 'Ukuran Perusahaan'])),
    eventDate,
    eventNameRaw: normalizeText(pickFirst(row, ['eventNameRaw', 'Nama Acara', 'nama_acara'])),
  }

  if (!eventDate && pickFirst(row, ['Tanggal Acara', 'eventDate', 'tanggal_acara'])) {
    prepared['dateParseFlag'] = 'UNPARSEABLE_DATE'
  }

  return prepared
}

function toContactSource(uploadSource: UploadSource): ContactSource {
  return uploadSource === 'onsite_import' ? 'manual' : 'excel_upload'
}

// Legacy ID mapping removed


export class EtlService {
  constructor(
    private contactRepo: IContactRepository,
    private flaggedRepo: IFlaggedRecordsRepository,
    private rawUploadRepo: IRawUploadRepository,
    private auditLogRepo: IAuditLogRepository,
    private registrationRepo: IRegistrationRepository,
    private normalizer: IEtlNormalizationService,
    private deduplicationService: IDeduplicationService,
    private batchSize = 50,
  ) {}

  async processFile(filePath: string, uploadedBy: string, opts: EtlProcessOptions = {}): Promise<EtlResult> {
    const filename = opts.originalFilename ?? path.basename(filePath)
    const uploadSource = opts.uploadSource ?? 'etl_import'
    const upload = await this.rawUploadRepo.create({
      filename,
      uploadedBy,
      rowCount: 0,
      upsertedCount: 0,
      flaggedCount: 0,
      failedCount: 0,
      status: 'pending',
    })

    const result: EtlResult = { processed: 0, upserted: 0, flagged: 0, failed: 0 }
    console.info('[ETL] Upload registered', {
      uploadId: upload.id,
      filename,
      filePath,
      uploadedBy,
      eventId: opts.eventId ?? null,
      uploadSource,
    })

    try {
      const fileBuffer = await readUploadFile(filePath)
      const workbook = XLSX.read(fileBuffer, { type: 'buffer', cellDates: true })
      const sheetName = workbook.SheetNames[0]
      if (!sheetName) throw new Error('No sheets found in workbook')

      const worksheet = workbook.Sheets[sheetName]
      if (!worksheet) throw new Error('Sheet not found')

      const parsedRows = XLSX.utils.sheet_to_json<RawContactRow>(worksheet, { defval: null, raw: false })
      const preparedRows = parsedRows.map(prepareRow)
      result.processed = preparedRows.length
      console.info('[ETL] File parsed', {
        uploadId: upload.id,
        filename,
        rowCount: result.processed,
        batchSize: this.batchSize,
        sheetName,
      })

      const batches = chunk(preparedRows, this.batchSize)
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex]!
        console.info('[ETL] Processing batch', {
          uploadId: upload.id,
          filename,
          batchIndex: batchIndex + 1,
          batchCount: batches.length,
          batchLength: batch.length,
        })

        try {
          const normalized = await retryWithBackoff(
            () => this.normalizer.normalizeBatch(batch),
            3,
            2000,
          )

          if (normalized.length !== batch.length) {
            throw new Error('Normalizer returned mismatched row count')
          }

          const sanitizedRows = normalized.map((row, index) => sanitizeNormalizedRow(row, batch[index]!))

          for (let index = 0; index < sanitizedRows.length; index++) {
            const row = sanitizedRows[index]!
            const rawRow = batch[index]!
            const parsedRow = NormalizedRowSchema.safeParse(row)

            if (!parsedRow.success) {
              console.warn('[ETL] Row failed validation and was flagged', {
                uploadId: upload.id,
                filename,
                batchIndex: batchIndex + 1,
                rowIndexInBatch: index,
                summary: summarizeInvalidRow(row, rawRow, parsedRow.error.issues),
              })
              await this.flaggedRepo.create({
                rawData: { ...rawRow, normalized: row },
                flags: [...row.flags, ...parsedRow.error.issues.map((issue) => `validation:${issue.path.join('.') || 'row'}`)],
                status: 'pending',
                uploadId: upload.id,
                resolvedBy: null,
                resolvedAt: null,
              })
              result.flagged++
              continue
            }

            const validatedRow = parsedRow.data

            if (validatedRow.confidence >= 0.7) {
              const contact = await this.contactRepo.upsert({
                name: validatedRow.name,
                phone: validatedRow.phone,
                email: validatedRow.email,
                serviceType: validatedRow.serviceType,
                jobTitle: validatedRow.jobTitle,
                city: validatedRow.city,
                company: validatedRow.company,
                department: validatedRow.department,
                eventDate: validatedRow.eventDate,
                source: toContactSource(uploadSource),
                completenessScore: computeCompletenessScore(validatedRow),
                consentStatus: 'legacy_unverified',
                flagCategory: null,
                deletedAt: null,
              })

              if (opts.eventId) {
                await this.registrationRepo.create({
                  contactId: contact.id,
                  eventId: opts.eventId,
                  status: 'attended',
                  ticketToken: null,
                  aiScore: validatedRow.confidence,
                  flagOverride: false,
                  approvedAt: null,
                  attendedAt: validatedRow.eventDate ? `${validatedRow.eventDate}T00:00:00.000Z` : new Date().toISOString(),
                  uploadSource,
                  eventDate: validatedRow.eventDate,
                  eventNameRaw: validatedRow.eventNameRaw,
                })
              }

              await this.deduplicationService.findPotentialDuplicates(contact)
              result.upserted++
              continue
            }

            console.warn('[ETL] Row flagged', {
              uploadId: upload.id,
              filename,
              batchIndex: batchIndex + 1,
              rowIndexInBatch: index,
              summary: summarizeFlaggedRow(validatedRow, rawRow),
            })
            await this.flaggedRepo.create({
              rawData: { ...rawRow, normalized: validatedRow },
              flags: [...validatedRow.flags, ...(rawRow.dateParseFlag ? [String(rawRow.dateParseFlag)] : [])],
              status: 'pending',
              uploadId: upload.id,
              resolvedBy: null,
              resolvedAt: null,
            })
            result.flagged++
          }

          console.info('[ETL] Batch completed', {
            uploadId: upload.id,
            filename,
            batchIndex: batchIndex + 1,
            processedSoFar: Math.min((batchIndex + 1) * this.batchSize, result.processed),
            upserted: result.upserted,
            flagged: result.flagged,
            failed: result.failed,
          })
        } catch (error) {
          console.error('[ETL] Batch failed', {
            uploadId: upload.id,
            filename,
            batchIndex: batchIndex + 1,
            batchLength: batch.length,
            error: formatError(error),
            sampleRows: summarizeBatch(batch),
          })
          result.failed += batch.length
        }
      }

      const uploadStatus = result.failed > 0 && result.upserted === 0 && result.flagged === 0 ? 'failed' : 'completed'
      await this.rawUploadRepo.update(upload.id, {
        rowCount: result.processed,
        upsertedCount: result.upserted,
        flaggedCount: result.flagged,
        failedCount: result.failed,
        status: uploadStatus,
      })

      await this.auditLogRepo.create({
        action: 'contact.imported',
        actorId: uploadedBy,
        actorRole: 'admin',
        eventId: opts.eventId ?? null,
        targetId: upload.id,
        targetType: 'raw_upload',
        metadata: {
          filename,
          uploadSource,
          ...result,
        },
      })

      console.info('[ETL] Upload finished', {
        uploadId: upload.id,
        filename,
        status: uploadStatus,
        ...result,
      })

      return result
    } catch (error) {
      console.error('[ETL] Upload processing crashed', {
        uploadId: upload.id,
        filename,
        error: formatError(error),
      })
      throw error
    } finally {
      await deleteFile(filePath).catch(() => undefined)
    }
  }
}

export { computeCompletenessScore }
