/**
 * OpenAI Proxy YoriMind Service (Phase 2)
 *
 * Real implementation of IYoriMindService using GPT-5 via mlapi.run OpenAI-compatible proxy.
 * Swap in by setting YORIMIND_AI_PROVIDER=openai-proxy and configuring:
 *   YORIMIND_AI_BASE_URL=https://mlapi.run/abc-1234-xyz/v1
 *   YORIMIND_AI_API_KEY=your-key-here
 *
 * Model is hardcoded to openai/gpt-5.
 */

import OpenAI from 'openai'
import { config } from '../../../config/index.js'
import type { IYoriMindService, EventSnapshot, YoriMindResult } from '../../../interfaces/services/IYoriMindService.js'

const SYSTEM_PROMPT = `Anda adalah YoriMind, asisten AI analitik event untuk platform Yorindo di Indonesia.
Tugas Anda adalah menganalisis data event dan memberikan insight dalam bahasa Indonesia.

Berikan respons dalam format JSON EXACT seperti schema berikut:
{
  "summary": "Ringkasan performa event dalam 2-3 kalimat (bahasa Indonesia)",
  "insights": ["Insight 1", "Insight 2", "Insight 3"],
  "recommendations": ["Rekomendasi 1", "Rekomendasi 2", "Rekomendasi 3"],
  "generatedAt": "ISO date string"
}

Rules:
- Gunakan bahasa Indonesia yang profesional dan mudah dipahami
- Berikan 3 insight berdasarkan data
- Berikan 3 rekomendasi yang actionable
- Fokus pada metrik: registration rate, attendance rate, conversion
- Jika data menunjukkan performa buruk, berikan analisis penyebab yang masuk akal
- Jika data menunjukkan performa baik, berikan insight tentang faktor keberhasilan`

export class OpenAiProxyYoriMindService implements IYoriMindService {
  private client: OpenAI

  constructor() {
    if (!config.yorimindAiBaseUrl || !config.yorimindAiApiKey) {
      throw new Error('YORIMIND_AI_BASE_URL and YORIMIND_AI_API_KEY are required when YORIMIND_AI_PROVIDER=openai-proxy')
    }

    this.client = new OpenAI({
      apiKey: config.yorimindAiApiKey,
      baseURL: config.yorimindAiBaseUrl,
    })
  }

  async analyze(snapshot: EventSnapshot): Promise<YoriMindResult> {
    const attendanceRate = snapshot.registrationCount > 0
      ? Math.round((snapshot.attendedCount / snapshot.registrationCount) * 100)
      : 0
    const approvalRate = snapshot.registrationCount > 0
      ? Math.round((snapshot.approvedCount / snapshot.registrationCount) * 100)
      : 0

    const userContent = `Analisis event berikut:

Nama Event: ${snapshot.eventName}
Tanggal: ${snapshot.eventDate}
Kapasitas: ${snapshot.capacity ?? 'Tidak terbatas'}
Total Pendaftar: ${snapshot.registrationCount}
Disetujui: ${snapshot.approvedCount} (${approvalRate}%)
Hadir: ${snapshot.attendedCount} (${attendanceRate}%)
Tingkat Konversi: ${Math.round(snapshot.conversionRate * 100)}%

Detail Pendaftar:
${JSON.stringify(snapshot.registrations.slice(0, 20), null, 2)}
${snapshot.registrations.length > 20 ? `\n... dan ${snapshot.registrations.length - 20} pendaftar lainnya` : ''}

Berikan analisis mendalam dalam format JSON.`

    const response = await this.client.chat.completions.create({
      model: 'openai/gpt-5',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userContent },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 4096,
    })

    const content = response.choices[0]?.message?.content
    if (!content) throw new Error('Empty response from YoriMind AI service')

    const parsed = JSON.parse(content)

    return {
      disabled: false,
      summary: parsed.summary ?? 'Tidak ada ringkasan yang tersedia.',
      insights: Array.isArray(parsed.insights) ? parsed.insights : [],
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
      generatedAt: parsed.generatedAt ?? new Date().toISOString(),
    }
  }
}
