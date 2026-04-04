export interface RawContactRow {
  [key: string]: string | number | null | undefined
}

export interface NormalizedRow {
  name: string
  phone: string
  email: string | null
  city: string | null
  company: string | null
  department: string | null
  serviceType: string | null
  jobTitle: string | null
  confidence: number
  flags: string[]
  provinceCode: string | null
  provinceName: string | null
  cityCode: string | null
  cityName: string | null
  eventDate: string | null
  eventNameRaw: string | null
}

export interface IEtlNormalizationService {
  normalizeBatch(rows: RawContactRow[]): Promise<NormalizedRow[]>
}
