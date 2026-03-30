import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'

export default function DataRightsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Hak Data Anda</h1>
      <p className="text-muted-foreground text-sm mb-8">
        Sesuai Undang-Undang Perlindungan Data Pribadi (UU PDP), Anda memiliki hak atas data pribadi yang kami simpan.
      </p>

      <div className="space-y-4">
        <Link href="/data-rights/request" className="block">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
            <CardContent className="flex items-start gap-4 pt-5 pb-5">
              <div className="text-2xl">📋</div>
              <div>
                <h2 className="font-semibold">Minta Salinan Data</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Dapatkan salinan seluruh data pribadi Anda yang tersimpan dalam sistem kami, sesuai UU PDP Pasal 28.
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/data-rights/erasure" className="block">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
            <CardContent className="flex items-start gap-4 pt-5 pb-5">
              <div className="text-2xl">🗑️</div>
              <div>
                <h2 className="font-semibold">Hapus Data Saya</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Minta penghapusan dan anonimisasi permanen atas seluruh data pribadi Anda. Tindakan ini tidak dapat dibatalkan.
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/data-rights/learn" className="block">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
            <CardContent className="flex items-start gap-4 pt-5 pb-5">
              <div className="text-2xl">📚</div>
              <div>
                <h2 className="font-semibold">Pelajari Hak Data Anda</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Pahami perbedaan antara pembatalan pendaftaran dan penghapusan data, serta implikasi masing-masing.
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}
