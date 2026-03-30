export interface IEtlNormalizationService {
  normalizeBatch(rows: any[]): Promise<any[]>;
}