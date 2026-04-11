import type { IInsightsService, EventSnapshot, InsightsResult } from '../../../interfaces/services/IInsightsService.js'
import { getPool } from '../../../lib/postgres.js'

const SYSTEM_PROMPT = `Anda adalah asisten AI analitik event untuk platform EM · U di Indonesia.
Analisis snapshot event berikut dan berikan insight yang mendalam dalam bahasa Indonesia.

Format respons HARUS berupa JSON valid dengan struktur berikut:
{
  "summary": "Ringkasan singkat performa event (2-3 kalimat)",
  "analysis": "Paragraf analisis mendalam tentang tren dan pola data",
  "root_causes": ["Penyebab 1", "Penyebab 2", "Penyebab 3"],
  "recommendations": [
    {"action": "Rekomendasi 1", "priority": "high|medium|low", "impact": "Dampak yang diharapkan"},
    {"action": "Rekomendasi 2", "priority": "high|medium|low", "impact": "Dampak yang diharapkan"}
  ],
  "tracked_metrics": ["Metrik 1", "Metrik 2", "Metrik 3"]
}

PENTING:
- Gunakan bahasa Indonesia yang profesional dan jelas
- Berikan analisis yang spesifik berdasarkan data yang tersedia
- Prioritaskan rekomendasi berdasarkan dampak terhadap konversi
- Tracked metrics harus berupa array string sederhana`

interface SettingCache {
  AI_PROVIDER: string
  AI_MODEL: string
  AI_BASE_URL: string | null
  AI_API_KEY: string | null
  lastFetched: number
}

let settingCache: SettingCache | null = null
const CACHE_TTL = 5_000

export function clearSettingsCache(): void {
  settingCache = null
}

async function getSettings(): Promise<SettingCache> {
  if (settingCache && Date.now() - settingCache.lastFetched < CACHE_TTL) {
    return settingCache
  }

  const pool = getPool()
  const { rows } = await pool.query(
    `SELECT key, value FROM settings WHERE key IN ('AI_PROVIDER', 'AI_MODEL', 'AI_BASE_URL', 'AI_API_KEY')`,
  )

  const settings: Record<string, string | null> = {}
  for (const row of rows) {
    settings[row.key] = row.value
  }

  settingCache = {
    AI_PROVIDER: settings['AI_PROVIDER'] ?? 'mock',
    AI_MODEL: settings['AI_MODEL'] ?? 'gpt-4o',
    AI_BASE_URL: settings['AI_BASE_URL'] ?? null,
    AI_API_KEY: settings['AI_API_KEY'] ?? null,
    lastFetched: Date.now(),
  }
  return settingCache
}

function getBaseUrl(provider: string): string {
  switch (provider) {
    case 'openai': return 'https://api.openai.com/v1'
    case 'groq':   return 'https://api.groq.com/openai/v1'
    default:       return 'https://api.openai.com/v1'
  }
}

function buildPrompt(snapshot: EventSnapshot): string {
  return `Analisis event berikut:

**Nama Event:** ${snapshot.eventName}
**Tanggal:** ${snapshot.eventDate}
**Kapasitas:** ${snapshot.capacity ?? 'Tidak terbatas'}
**Total Mendaftar:** ${snapshot.registrationCount}
**Disetujui:** ${snapshot.approvedCount}
**Hadir:** ${snapshot.attendedCount}
**Tingkat Konversi:** ${snapshot.conversionRate}%

${snapshot.registrations.length > 0 ? `
**Sample Registrasi (${snapshot.registrations.length} terbaru):**
${snapshot.registrations.map(r => `- ${r.contactName} | Status: ${r.status}${r.aiScore ? ` | AI Score: ${r.aiScore}` : ''}`).join('\n')}
` : ''}

Berikan analisis mendalam dalam format JSON yang diminta.`
}

export class InsightsService implements IInsightsService {
  async analyze(snapshot: EventSnapshot): Promise<InsightsResult> {
    let settings: SettingCache
    try {
      settings = await getSettings()
    } catch {
      console.log('[Insights] DB unavailable, falling back to mock analysis')
      return this.getMockAnalysis(snapshot)
    }

    if (settings.AI_PROVIDER === 'disabled') {
      return {
        disabled: true,
        summary: 'Fitur AI Insights dinonaktifkan',
        analysis: '',
        root_causes: [],
        recommendations: [],
        tracked_metrics: [],
        generatedAt: new Date().toISOString(),
      }
    }

    if (settings.AI_PROVIDER === 'mock' || !settings.AI_API_KEY) {
      return this.getMockAnalysis(snapshot)
    }

    const baseUrl = settings.AI_BASE_URL || getBaseUrl(settings.AI_PROVIDER)
    const model = settings.AI_MODEL || 'gpt-4o'

    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${settings.AI_API_KEY}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: buildPrompt(snapshot) },
          ],
          temperature: 0.7,
          max_tokens: 2000,
          response_format: { type: 'json_object' },
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`AI API error: ${response.status} ${errorText}`)
      }

      const data = await response.json()
      const content = data.choices?.[0]?.message?.content
      if (!content) throw new Error('Empty response from AI provider')

      const parsed = JSON.parse(content)
      return {
        summary: parsed.summary ?? 'Tidak ada ringkasan',
        analysis: parsed.analysis ?? 'Tidak ada analisis',
        root_causes: parsed.root_causes ?? [],
        recommendations: parsed.recommendations ?? [],
        tracked_metrics: parsed.tracked_metrics ?? [],
        generatedAt: new Date().toISOString(),
      }
    } catch (error) {
      console.error('[Insights] Error:', error)
      return this.getMockAnalysis(snapshot)
    }
  }

  private async getMockAnalysis(snapshot: EventSnapshot): Promise<InsightsResult> {
    const attendanceRate = snapshot.registrationCount > 0
      ? (snapshot.attendedCount / snapshot.registrationCount) * 100
      : 0

    return {
      summary: `Event "${snapshot.eventName}" memiliki ${snapshot.registrationCount} pendaftar dengan ${snapshot.approvedCount} disetujui. Tingkat kehadiran saat ini ${attendanceRate.toFixed(1)}% dari total pendaftar.`,
      analysis: 'Berdasarkan data yang tersedia, terlihat pola konversi yang perlu diperhatikan. Tingkat persetujuan menunjukkan efektivitas proses seleksi, sementara tingkat kehadiran mengindikasikan relevansi event bagi peserta. Perlu strategi follow-up untuk meningkatkan kehadiran peserta yang sudah disetujui.',
      root_causes: [
        'Proses approval yang ketat memfilter peserta berkualitas',
        'Waktu event mungkin bertabrakan dengan agenda lain',
        'Kurangnya reminder atau engagement pasca-approval',
      ],
      recommendations: [
        { action: 'Kirim reminder H-3 dan H-1 ke peserta yang sudah disetujui', priority: 'high' as const, impact: 'Meningkatkan kehadiran hingga 15-20%' },
        { action: 'Evaluasi kriteria approval untuk meningkatkan konversi', priority: 'medium' as const, impact: 'Memperluas basis peserta yang relevan' },
        { action: 'Buat grup WhatsApp atau Telegram untuk peserta', priority: 'low' as const, impact: 'Meningkatkan engagement dan sense of community' },
      ],
      tracked_metrics: ['Approval Rate', 'Attendance Rate', 'No-Show Rate'],
      generatedAt: new Date().toISOString(),
    }
  }
}
