import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'

export default function LearnDataRightsPage() {
  return (
    <div>
      <Link href="/data-rights" className="text-sm text-primary hover:underline mb-4 inline-block">
        ← Kembali
      </Link>

      <h1 className="text-xl font-bold mb-2">Pelajari Hak Data Anda</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Berdasarkan Undang-Undang No. 27 Tahun 2022 tentang Perlindungan Data Pribadi (UU PDP).
      </p>

      <div className="space-y-6">
        <Card>
          <CardContent className="pt-5">
            <h2 className="font-semibold mb-2">❌ Pembatalan Pendaftaran</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Membatalkan pendaftaran event <strong className="text-foreground">hanya membatalkan slot kehadiran Anda</strong> di event tersebut.
              Data pribadi Anda (nama, email, nomor telepon) <strong className="text-foreground">tetap tersimpan</strong> dalam sistem kami untuk keperluan
              riwayat dan analisis event. Anda masih dapat mendaftar event lain menggunakan data yang sama.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <h2 className="font-semibold mb-2">🗑️ Penghapusan Data (Erasure)</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Penghapusan data <strong className="text-foreground">menganonimkan seluruh data pribadi Anda secara permanen</strong> di semua catatan sistem Yorindo.
              Ini termasuk nama, email, nomor telepon, dan identitas lainnya. Riwayat kehadiran event dapat dipertahankan namun
              <strong className="text-foreground"> tidak lagi terhubung ke identitas Anda</strong>. Tindakan ini tidak dapat dibatalkan.
            </p>
          </CardContent>
        </Card>

        <Card className="overflow-x-auto">
          <CardContent className="pt-5">
            <h2 className="font-semibold mb-4">Perbandingan</h2>
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 pr-4 text-muted-foreground font-medium">Aspek</th>
                  <th className="text-left py-2 pr-4 text-primary font-medium">Pembatalan</th>
                  <th className="text-left py-2 text-destructive font-medium">Penghapusan Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[
                  ['Data Pribadi', 'Tetap tersimpan', 'Dianonimkan permanen'],
                  ['Riwayat Event', 'Tercatat sebagai dibatalkan', 'Tetap ada (tanpa identitas)'],
                  ['Bisa Dibatalkan', '✅ Ya', '❌ Tidak'],
                  ['Daftar Event Lain', '✅ Bisa', '❌ Tidak (data terhapus)'],
                  ['Waktu Proses', 'Segera', '30 hari kerja'],
                ].map(([aspect, cancel, erase]) => (
                  <tr key={aspect}>
                    <td className="py-2 pr-4 text-muted-foreground font-medium">{aspect}</td>
                    <td className="py-2 pr-4 text-foreground">{cancel}</td>
                    <td className="py-2 text-foreground">{erase}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
