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
  "analysis": "Analisis mendalam 1-2 paragraf tentang performa event, termasuk faktor keberhasilan atau kegagalan",
  "root_causes": ["Penyebab utama 1", "Penyebab utama 2", "Penyebab utama 3"],
  "recommendations": [
    { "action": "Rekomendasi tindakan spesifik", "priority": "high|medium|low", "impact": "Dampak yang diharapkan jika rekomendasi ini dijalankan" }
  ],
  "tracked_metrics": ["Metrik 1", "Metrik 2", "Metrik 3"],
  "generatedAt": "ISO date string"
}

Rules:
- Gunakan bahasa Indonesia yang profesional dan mudah dipahami
- Berikan 3 root causes yang spesifik berdasarkan data (bukan generik)
- Berikan 3 rekomendasi yang actionable dengan prioritas yang jelas
- Berikan 3-5 tracked metrics yang relevan untuk dipantau ke depan
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
      max_completion_tokens: 4096,
    })

    const content = response.choices[0]?.message?.content
    if (!content) throw new Error('Empty response from YoriMind AI service')

    const parsed = JSON.parse(content)

    // Handle both old format (insights[], recommendations: string[]) and new format
    const rootCauses = Array.isArray(parsed.root_causes)
      ? parsed.root_causes
      : Array.isArray(parsed.insights)
        ? parsed.insights
        : []

    const recommendations = Array.isArray(parsed.recommendations)
      ? parsed.recommendations.map((rec: unknown) => {
          if (typeof rec === 'string') return { action: rec, priority: 'medium' as const, impact: '' }
          if (typeof rec === 'object' && rec !== null) {
            const r = rec as Record<string, unknown>
            return {
              action: typeof r.action === 'string' ? r.action : '',
              priority: (r.priority === 'high' || r.priority === 'medium' || r.priority === 'low') ? r.priority : 'medium' as const,
              impact: typeof r.impact === 'string' ? r.impact : '',
            }
          }
          return { action: '', priority: 'medium' as const, impact: '' }
        })
      : []

    return {
      disabled: false,
      summary: parsed.summary ?? 'Tidak ada ringkasan yang tersedia.',
      analysis: parsed.analysis ?? 'Tidak ada analisis yang tersedia.',
      root_causes: rootCauses,
      recommendations,
      tracked_metrics: Array.isArray(parsed.tracked_metrics) ? parsed.tracked_metrics : [],
      generatedAt: parsed.generatedAt ?? new Date().toISOString(),
    }
  }
}
