/**
 * OpenAI ETL Normalization Service (Phase 2)
 *
 * Real implementation of IEtlNormalizationService using the OpenAI API.
 * Swap in by setting ETL_AI_PROVIDER=openai and OPENAI_API_KEY in env.
 *
 * Phase 1: This file exists but is never imported at startup.
 * Phase 2: container.ts will import and instantiate this when SERVICE_IMPL=real.
 */

import OpenAI from 'openai'
import { config } from '../../../config/index.js'
import type { IEtlNormalizationService, RawContactRow, NormalizedRow } from '../../../interfaces/services/IEtlNormalizationService.js'

const SYSTEM_PROMPT = `You are a data normalization assistant for an Indonesian B2B events platform.
Given raw participant data rows, normalize each row into structured format.
Return ONLY valid JSON array matching the schema exactly.
For each row output: { "name": string, "phone": string (format: +62XXXXXXXXXX), "email": string|null, "industrySlug": string|null, "jobTitleSlug": string|null, "city": string|null, "company": string|null, "department": string|null, "companySize": "<50"|"50-200"|"200-1000"|">1000"|null, "confidence": number (0.0-1.0), "flags": string[], "provinceCode": string|null, "provinceName": string|null, "cityCode": string|null, "cityName": string|null, "eventDate": string|null, "eventNameRaw": string|null }
Indonesian phone numbers: strip spaces/dashes, add +62 prefix, remove leading 0.
Low confidence (< 0.7) if: phone invalid, name missing, duplicate suspected.`

export class OpenAiEtlNormalizationService implements IEtlNormalizationService {
  private client: OpenAI

  constructor() {
    this.client = new OpenAI({ apiKey: config.openaiApiKey })
  }

  async normalizeBatch(rows: RawContactRow[]): Promise<NormalizedRow[]> {
    const userContent = JSON.stringify(rows)

    const response = await this.client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userContent },
      ],
      response_format: { type: 'json_object' },
      temperature: 0,
    })

    const content = response.choices[0]?.message?.content
    if (!content) throw new Error('Empty response from AI normalization service')

    const parsed = JSON.parse(content)
    // AI returns { rows: [...] } or directly an array
    const result = Array.isArray(parsed) ? parsed : (parsed.rows ?? parsed.data ?? [])

    if (!Array.isArray(result)) {
      throw new Error('AI normalization service returned non-array response')
    }

    return result as NormalizedRow[]
  }
}
