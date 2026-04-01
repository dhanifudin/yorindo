import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center">
      <h1 className="text-2xl font-bold mb-2">Event Tidak Ditemukan</h1>
      <p className="text-muted-foreground mb-6">Maaf, event yang Anda cari tidak tersedia atau sudah berakhir.</p>
      <Link href="/" className="text-primary hover:underline text-sm">
        Kembali ke Beranda
      </Link>
    </div>
  )
}
