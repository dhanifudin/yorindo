import type { IEtlNormalizationService, RawContactRow, NormalizedRow } from '../../../interfaces/services/IEtlNormalizationService.js'

/**
 * Mock ETL normalization service.
 * Returns deterministic results: 80% of rows get confidence >= 0.7, 20% get < 0.7.
 * Uses djb2 hash for determinism (same row always gets same confidence).
 */
function djb2(str: string): number {
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i)
  }
  return Math.abs(hash)
}

function normalizePhone(raw: string | null | undefined): string {
  if (!raw) return ''
  const digits = String(raw).replace(/\D/g, '')
  if (digits.startsWith('0')) return `+62${digits.slice(1)}`
  if (digits.startsWith('62')) return `+${digits}`
  return `+62${digits}`
}

export class MockEtlNormalizationService implements IEtlNormalizationService {
  async normalizeBatch(rows: RawContactRow[]): Promise<NormalizedRow[]> {
    return rows.map((row, index) => {
      const key = JSON.stringify(row)
      const hash = djb2(key + index)
      const isLowConfidence = hash % 5 === 0  // 20% low confidence

      const phone = normalizePhone(String(row.phone ?? row['No Handphone'] ?? row.telepon ?? row.no_hp ?? ''))
      const name = String(row.name ?? row.nama ?? row.Nama ?? '').trim()
      const flags: string[] = []

      if (!name) flags.push('missing_name')
      if (!phone || phone.length < 10) flags.push('invalid_phone')
      if (isLowConfidence) flags.push('low_confidence')

      return {
        name: name || `Unknown ${index + 1}`,
        phone: phone || `+628000${String(index).padStart(6, '0')}`,
        email: (row.email ?? row.Email) ? String(row.email ?? row.Email) : null,
        city: (row.city ?? row['Asal Kota']) ? String(row.city ?? row['Asal Kota']) : null,
        company: (row.company ?? row.perusahaan ?? row['Nama Instansi']) ? String(row.company ?? row.perusahaan ?? row['Nama Instansi']) : null,
        department: (row.department ?? row['Departemen']) ? String(row.department ?? row['Departemen']) : null,
        serviceType: (row.serviceType ?? row['Jenis Industri'] ?? row['Jenis Layanan']) ? String(row.serviceType ?? row['Jenis Industri'] ?? row['Jenis Layanan']) : null,
        jobTitle: (row.jobTitle ?? row['Jabatan']) ? String(row.jobTitle ?? row['Jabatan']) : null,
        confidence: isLowConfidence ? 0.5 : 0.85,
        flags,
        eventDate: (row.eventDate ?? row['Tanggal Acara']) ? String(row.eventDate ?? row['Tanggal Acara']) : null,
      }
    })
  }
}
