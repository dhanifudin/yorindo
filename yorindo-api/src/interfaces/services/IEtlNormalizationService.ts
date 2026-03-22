export interface RawContactRow {
  [key: string]: string | number | null | undefined
}

export interface NormalizedRow {
  name: string
  phone: string             // normalized to +62XXXXXXXXXX
  email: string | null
  city: string | null
  company: string | null
  companySize: string | null
  industrySlug: string | null
  jobTitleSlug: string | null
  confidence: number        // 0.0 to 1.0 — rows < 0.7 become flagged records
  flags: string[]           // reasons for low confidence
}

export interface IEtlNormalizationService {
  /**
   * Normalize a batch of raw contact rows from an Excel upload.
   * Returns one NormalizedRow per input row.
   * Low-confidence rows (confidence < 0.7) are flagged, not rejected.
   */
  normalizeBatch(rows: RawContactRow[]): Promise<NormalizedRow[]>
}
