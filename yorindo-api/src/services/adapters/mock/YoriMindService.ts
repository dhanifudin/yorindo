import type { IYoriMindService, EventSnapshot, YoriMindResult } from '../../../interfaces/services/IYoriMindService.js'

export class MockYoriMindService implements IYoriMindService {
  async analyze(snapshot: EventSnapshot): Promise<YoriMindResult> {
    return {
      summary: `Event "${snapshot.eventName}" memiliki ${snapshot.registrationCount} pendaftar dengan tingkat konversi ${Math.round(snapshot.conversionRate * 100)}%. Sebagian besar peserta berasal dari industri teknologi.`,
      insights: [
        `Tingkat kehadiran sebesar ${Math.round(snapshot.conversionRate * 100)}% ${snapshot.conversionRate >= 0.6 ? 'memenuhi' : 'di bawah'} target 60%.`,
        `${snapshot.approvedCount} dari ${snapshot.registrationCount} pendaftar telah disetujui.`,
        'Profil peserta menunjukkan ketertarikan tinggi pada topik yang relevan.',
      ],
      recommendations: [
        'Kirim pengingat 3 hari sebelum event untuk meningkatkan kehadiran.',
        'Pertimbangkan untuk memperluas kapasitas waitlist jika minat tetap tinggi.',
        'Gunakan data skor AI untuk memprioritaskan follow-up pada pendaftar berekor tinggi.',
      ],
      generatedAt: new Date().toISOString(),
    }
  }
}
