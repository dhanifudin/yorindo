// src/services/adapters/real/RuleBasedEtlNormalizationService.ts
import { readFileSync } from 'fs';
import { join } from 'path';
import type { NormalizedRow } from '../../../workers/etl.worker';
import type { IEtlNormalizationService } from '../../interfaces/services/IEtlNormalizationService';

const CITY_ALIAS_MAP: Record<string, { province_code: string; city_code: string | null }> = {
  'jkt': { province_code: '31', city_code: '31.71' },
  'jakarta': { province_code: '31', city_code: null },
  'jakarta pusat': { province_code: '31', city_code: '31.71' },
  'jakarta selatan': { province_code: '31', city_code: '31.74' },
  'surabaya': { province_code: '35', city_code: '35.78' },
  'purwakarta': { province_code: '32', city_code: '32.14' },
};

interface WilayahData {
  provinces: Array<{ code: string; name: string }>;
  regencies: Array<{ code: string; name: string; province_code: string }>;
}

export class RuleBasedEtlNormalizationService implements IEtlNormalizationService {
  private wilayahData: WilayahData = { provinces: [], regencies: [] };

  constructor() {
    this.loadWilayahData();
  }

  private loadWilayahData() {
    try {
      const filePath = join(process.cwd(), 'src/data/wilayah-static.json');
      const raw = readFileSync(filePath, 'utf-8');
      this.wilayahData = JSON.parse(raw);
    } catch (err) {
      console.warn('Wilayah data gagal load', err);
    }
  }

  private normalizeCityInput(rawCity?: string | null): string {
    if (!rawCity) return '';
    return rawCity.toLowerCase().trim()
      .replace(/^kota\s+/i, '')
      .replace(/^kabupaten\s+/i, '')
      .replace(/^kab\.\s*/i, '');
  }

  // 🔥 Fuzzy sederhana (tanpa library)
  private similarity(a: string, b: string): number {
    if (!a || !b) return 0;

    let matches = 0;
    const shorter = a.length < b.length ? a : b;
    const longer = a.length >= b.length ? a : b;

    for (let i = 0; i < shorter.length; i++) {
      if (longer.includes(shorter[i])) matches++;
    }

    return matches / longer.length;
  }

  public mapCityToCode(rawCity?: string | null) {
    if (!rawCity) return this.emptyCity();

    const normalized = this.normalizeCityInput(rawCity);

    // 1. Alias
    const alias = CITY_ALIAS_MAP[normalized];
    if (alias) {
      const province = this.wilayahData.provinces.find(p => p.code === alias.province_code);
      const regency = this.wilayahData.regencies.find(r => r.code === alias.city_code);

      return {
        province_code: alias.province_code,
        province_name: province?.name || null,
        city_code: alias.city_code,
        city_name: regency?.name || null,
        confidence: 0.95
      };
    }

    // 2. Exact
    const exact = this.wilayahData.regencies.find(r =>
      this.normalizeCityInput(r.name) === normalized
    );

    if (exact) {
      const province = this.wilayahData.provinces.find(p => p.code === exact.province_code);

      return {
        province_code: exact.province_code,
        province_name: province?.name || null,
        city_code: exact.code,
        city_name: exact.name,
        confidence: 1.0
      };
    }

    // 3. Fuzzy
    let bestScore = 0;
    let bestMatch: WilayahData['regencies'][0] | null = null;

    for (const regency of this.wilayahData.regencies) {
      const score = this.similarity(
        normalized,
        this.normalizeCityInput(regency.name)
      );

      if (score > bestScore) {
        bestScore = score;
        bestMatch = regency;
      }
    }

    if (bestScore >= 0.6 && bestMatch) {
      const province = this.wilayahData.provinces.find(p => p.code === bestMatch.province_code);

      return {
        province_code: bestMatch.province_code,
        province_name: province?.name || null,
        city_code: bestMatch.code,
        city_name: bestMatch.name,
        confidence: Number(bestScore.toFixed(2))
      };
    }

    return this.emptyCity();
  }

  private emptyCity() {
    return {
      province_code: null,
      province_name: null,
      city_code: null,
      city_name: null,
      confidence: 0
    };
  }

  async normalizeBatch(rows: any[]): Promise<NormalizedRow[]> {
    return rows.map(rawRow => {
      const cityMapping = this.mapCityToCode(
        rawRow['Asal Kota'] || rawRow.city || rawRow['Kota']
      );

      const normalized: NormalizedRow = {
        name: rawRow['Nama Lengkap'] || '',
        phone: this.normalizePhone(rawRow['No HP / Handphone']),
        email: this.normalizeEmail(rawRow.Email),
        industry_slug: this.mapIndustry(rawRow['Jenis Industri']),
        job_title_slug: this.mapJobTitle(rawRow.Jabatan),
        city: rawRow['Asal Kota'] || null,
        company: rawRow['Nama Instansi/Perusahaan'] || null,
        department: rawRow.Departemen || null,
        company_size: this.mapCompanySize(rawRow['Ukuran Perusahaan']),
        confidence: 0.8,
        flags: [],

        province_code: cityMapping.province_code,
        province_name: cityMapping.province_name,
        city_code: cityMapping.city_code,
        city_name: cityMapping.city_name,

        event_date: this.parseEventDate(rawRow['Tanggal Acara']),
        event_name_raw: rawRow['Nama Acara'] || null,
      };

      if (cityMapping.confidence < 0.7 && cityMapping.city_code) {
        normalized.confidence = 0.75;
        normalized.flags.push('LOW_CITY_CONFIDENCE');
      }

      if (!cityMapping.city_code) {
        normalized.flags.push('CITY_NOT_FOUND');
      }

      return normalized;
    });
  }

  private normalizePhone(phone: any): string {
    if (!phone) return '';
    let cleaned = String(phone).replace(/\D/g, '');

    if (cleaned.startsWith('0')) cleaned = '62' + cleaned.slice(1);
    if (!cleaned.startsWith('62')) cleaned = '62' + cleaned;

    return '+' + cleaned;
  }

  private normalizeEmail(email: any): string | null {
    if (!email) return null;
    return String(email).trim().toLowerCase();
  }

  private parseEventDate(value: any): string | null {
    if (!value) return null;

    if (typeof value === 'number') {
      const date = new Date((value - 25569) * 86400 * 1000);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    }

    const parsed = new Date(String(value));
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }

    return null;
  }

  private mapIndustry(val: any): string | null {
    return val ? String(val).toLowerCase().replace(/\s+/g, '-') : null;
  }

  private mapJobTitle(val: any): string | null {
    return val ? String(val).toLowerCase().replace(/\s+/g, '-') : null;
  }

  private mapCompanySize(val: any): string | null {
    return val ? String(val).toLowerCase() : null;
  }
}