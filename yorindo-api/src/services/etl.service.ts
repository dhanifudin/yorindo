/**
 * ETL Service
 *
 * Orchestrates the full ETL pipeline:
 *   1. Parse xlsx/csv file from temp storage
 *   2. Chunk rows into batches of 50
 *   3. Normalize each batch via IEtlNormalizationService
 *   4. Validate via Zod
 *   5. Route: confidence >= 0.7 → upsert contact; < 0.7 → create flagged_record
 *   6. Compute completeness score per upserted contact
 *   7. Delete temp file
 *   8. Return summary stats
 *
 * Accepts injected dependencies — fully testable without real DB or AI calls.
 */

import * as XLSX from 'xlsx'
import { z } from 'zod'
import { promises as fs } from 'fs'
import type { IContactRepository } from '../interfaces/repositories/IContactRepository.js'
import type { IFlaggedRecordsRepository } from '../interfaces/repositories/IFlaggedRecordsRepository.js'
import type { IRawUploadRepository } from '../interfaces/repositories/IRawUploadRepository.js'
import type { IAuditLogRepository } from '../interfaces/repositories/IAuditLogRepository.js'
import type { IEtlNormalizationService, RawContactRow } from '../interfaces/services/IEtlNormalizationService.js'

// ─── Zod Schema for normalized row ───────────────────────────────────────────

export const NormalizedRowSchema = z.object({
  name: z.string(),
  phone: z.string().regex(/^\+62\d{8,13}$/),
  email: z.string().email().nullable(),
  city: z.string().nullable(),
  company: z.string().nullable(),
  companySize: z.enum(['<50', '50-200', '200-1000', '>1000']).nullable(),
  industrySlug: z.string().nullable(),
  jobTitleSlug: z.string().nullable(),
  confidence: z.number().min(0).max(1),
  flags: z.array(z.string()),
})

export type ValidatedNormalizedRow = z.infer<typeof NormalizedRowSchema>

// ─── Result shape ─────────────────────────────────────────────────────────────

export interface EtlResult {
  processed: number
  upserted: number
  flagged: number
  failed: number
}

// ─── Completeness score ───────────────────────────────────────────────────────

function computeCompletenessScore(row: ValidatedNormalizedRow): number {
  const fields = [row.name, row.phone, row.email, row.company, row.industrySlug, row.jobTitleSlug, row.city, row.companySize]
  const nonNull = fields.filter(f => f !== null && f !== undefined && f !== '').length
  return Math.round((nonNull / fields.length) * 1000) / 1000
}

// ─── Retry helper ─────────────────────────────────────────────────────────────

async function retryWithBackoff<T>(fn: () => Promise<T>, attempts: number, baseDelayMs: number): Promise<T> {
  let lastErr: unknown
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn()
    } catch (err) {
      lastErr = err
      if (i < attempts - 1) {
        await new Promise(r => setTimeout(r, baseDelayMs * Math.pow(2, i)))
      }
    }
  }
  throw lastErr
}

// ─── EtlService ───────────────────────────────────────────────────────────────

export class EtlService {
  constructor(
    private contactRepo: IContactRepository,
    private flaggedRepo: IFlaggedRecordsRepository,
    private rawUploadRepo: IRawUploadRepository,
    private auditLogRepo: IAuditLogRepository,
    private normalizer: IEtlNormalizationService,
    private batchSize = 50,
  ) {}

  async processFile(filePath: string, uploadedBy: string): Promise<EtlResult> {
    // 1. Parse xlsx/csv
    const fileBuffer = await fs.readFile(filePath)
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows: RawContactRow[] = XLSX.utils.sheet_to_json(sheet, { defval: null })

    const result: EtlResult = { processed: rows.length, upserted: 0, flagged: 0, failed: 0 }

    // 2. Chunk into batches of batchSize
    const batches: RawContactRow[][] = []
    for (let i = 0; i < rows.length; i += this.batchSize) {
      batches.push(rows.slice(i, i + this.batchSize))
    }

    // 3. Process each batch
    for (const batch of batches) {
      try {
        const normalized = await retryWithBackoff(
          () => this.normalizer.normalizeBatch(batch),
          3,
          2000,
        )

        // 4. Validate via Zod
        const validated = NormalizedRowSchema.array().parse(normalized)

        // 5. Route rows
        for (const row of validated) {
          if (row.confidence >= 0.7) {
            await this.contactRepo.upsert({
              name: row.name,
              phone: row.phone,
              email: row.email,
              industryId: row.industrySlug,
              jobTitleId: row.jobTitleSlug,
              city: row.city,
              company: row.company,
              companySize: row.companySize as '<50' | '50-200' | '200-1000' | '>1000' | null,
              source: 'excel_upload',
              completenessScore: computeCompletenessScore(row),
              consentStatus: 'legacy_unverified',
              flagCategory: null,
              deletedAt: null,
            })
            result.upserted++
          } else {
            await this.flaggedRepo.create({
              rawData: row as unknown as Record<string, unknown>,
              flags: row.flags,
              status: 'pending',
              uploadId: uploadedBy,
              resolvedBy: null,
              resolvedAt: null,
            })
            result.flagged++
          }
        }
      } catch {
        result.failed += batch.length
      }
    }

    // 6. Delete temp file
    try {
      await fs.unlink(filePath)
    } catch {
      // Non-fatal — file may already be gone
    }

    // Insert raw_uploads PostgreSQL row on completion
    await this.rawUploadRepo.create({
      filename: filePath.split('/').pop() || 'unknown.xlsx',
      uploadedBy,
      rowCount: result.processed,
      upsertedCount: result.upserted,
      flaggedCount: result.flagged,
      failedCount: result.failed,
      status: 'completed'
    })

    // Write contact.imported audit log entry
    await this.auditLogRepo.create({
      action: 'contact.imported',
      actorId: uploadedBy,
      actorRole: 'system', // or whatever role represents the uploader
      eventId: null,
      targetId: null,
      targetType: 'contact_batch',
      metadata: { ...result, filename: filePath.split('/').pop() }
    })

    return result
  }
}
