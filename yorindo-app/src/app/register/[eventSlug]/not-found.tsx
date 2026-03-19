import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center">
      <h1 className="text-2xl font-bold text-gray-800 mb-2">Event Tidak Ditemukan</h1>
      <p className="text-gray-500 mb-6">Maaf, event yang Anda cari tidak tersedia atau sudah berakhir.</p>
      <Link href="/" className="text-blue-600 hover:underline text-sm">
        Kembali ke Beranda
      </Link>
    </div>
  )
}
