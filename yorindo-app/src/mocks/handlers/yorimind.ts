import { http, HttpResponse, delay } from 'msw'
import type { InsightsResult } from '@/types/api'

const mockInsightsResult: InsightsResult = {
  disabled: false,
  analysis:
    'Event menunjukkan tingkat minat awal yang kuat dengan 85% tingkat pendaftaran dalam 3 hari pertama kampanye. ' +
    'Namun, tingkat konversi menurun signifikan pada pertengahan minggu kedua, kemungkinan karena pengumuman acara ' +
    'pesaing di Surabaya yang bertepatan dengan periode pendaftaran puncak. Profil peserta didominasi oleh ' +
    'profesional mid-level dari sektor teknologi (32%) dan kesehatan (21%), konsisten dengan target segmentasi event.',
  root_causes: [
    'Pengumuman acara pesaing yang bertepatan dengan periode pendaftaran aktif (H-14 hingga H-10)',
    'Masalah pengiriman email blast pada hari ke-3 kampanye — 18% email tidak terkirim ke domain @gmail.com',
    'Landing page load time di atas 4 detik pada mobile device, berpotensi meningkatkan bounce rate',
  ],
  recommendations: [
    {
      action: 'Jadwalkan reminder email pada H-7 dan H-3 sebelum deadline pendaftaran',
      impact: 'Estimasi peningkatan konversi 15-20% berdasarkan data historis event serupa',
      priority: 'high',
    },
    {
      action: 'Tambahkan segmentasi peserta berdasarkan industri untuk personalisasi konten undangan',
      impact: 'Estimasi peningkatan email open rate 25-30%',
      priority: 'high',
    },
    {
      action: 'Optimalkan mobile performance landing page — target load time di bawah 2 detik',
      impact: 'Estimasi pengurangan bounce rate 10-15%',
      priority: 'medium',
    },
    {
      action: 'Pertimbangkan early-bird pricing untuk batch pendaftaran berikutnya (H-30 hingga H-21)',
      impact: 'Estimasi percepatan pengisian kuota 30-40%',
      priority: 'medium',
    },
    {
      action: 'Monitor deliverability email melalui Brevo analytics — whitelist domain jika diperlukan',
      impact: 'Pemulihan 18% email yang gagal terkirim',
      priority: 'low',
    },
  ],
  summary:
    'Performa keseluruhan: Baik (78/100). Kekuatan utama: engagement tinggi pada segmen teknologi dan kesehatan. ' +
    'Peluang utama: optimalkan timing email dan personalisasi segmentasi industri untuk event berikutnya.',
  tracked_metrics: [
    'conversion_rate',
    'attendee_retention',
    'industry_mix',
    'email_open_rate',
    'registration_velocity',
  ],
}

export const insightsHandlers = [
  http.get('/api/events/:id/insights', async () => {
    await delay(1200)
    return HttpResponse.json(mockInsightsResult)
  }),
]
