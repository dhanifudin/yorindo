import { Metadata } from 'next'

export const metadata: Metadata = { title: 'Dashboard — Yorindo Admin' }

export default function AdminDashboard() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Dashboard</h1>
      <p className="text-gray-500">Selamat datang di Yorindo Admin Portal.</p>
    </div>
  )
}
