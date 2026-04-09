import type { IYoriMindService, EventSnapshot, YoriMindResult } from '../../../interfaces/services/IYoriMindService.js'

export class MockYoriMindService implements IYoriMindService {
  async analyze(snapshot: EventSnapshot): Promise<YoriMindResult> {
    const attendanceRate = snapshot.registrationCount > 0
      ? Math.round((snapshot.attendedCount / snapshot.registrationCount) * 100)
      : 0

    return {
      summary: `Event "${snapshot.eventName}" memiliki ${snapshot.registrationCount} pendaftar dengan tingkat kehadiran ${attendanceRate}%. Sebagian besar peserta berasal dari industri teknologi.`,
      analysis: `Performa keseluruhan event menunjukkan minat awal yang kuat dengan ${snapshot.registrationCount} pendaftar. Tingkat kehadiran sebesar ${attendanceRate}% ${attendanceRate >= 60 ? 'memenuhi' : 'masih di bawah'} target industri. Profil peserta didominasi oleh profesional mid-level dari sektor teknologi, konsisten dengan target segmentasi event.`,
      root_causes: [
        'Pengumuman acara pesaing yang bertepatan dengan periode pendaftaran aktif',
        'Masalah pengiriman email blast pada hari ke-3 kampanye — 18% email tidak terkirim',
        'Landing page load time di atas 4 detik pada mobile device',
      ],
      recommendations: [
        {
          action: 'Jadwalkan reminder email pada H-7 dan H-3 sebelum deadline pendaftaran',
          impact: 'Estimasi peningkatan konversi 15-20% berdasarkan data historis event serupa',
          priority: 'high' as const,
        },
        {
          action: 'Tambahkan segmentasi peserta berdasarkan industri untuk personalisasi konten undangan',
          impact: 'Estimasi peningkatan email open rate 25-30%',
          priority: 'high' as const,
        },
        {
          action: 'Optimalkan mobile performance landing page — target load time di bawah 2 detik',
          impact: 'Estimasi pengurangan bounce rate 10-15%',
          priority: 'medium' as const,
        },
      ],
      tracked_metrics: ['conversion_rate', 'attendee_retention', 'industry_mix', 'email_open_rate'],
      generatedAt: new Date().toISOString(),
    }
  }
}
