'use client'

import { useAuthStore } from '@/store/authStore'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

/**
 * Scan page — hidden until implementation is ready.
 * Redirects to dashboard for all users.
 */
export default function ScanPage() {
  const accessToken = useAuthStore((s) => s.accessToken)
  const router = useRouter()

  useEffect(() => {
    if (!accessToken) {
      router.replace('/login')
    } else {
      router.replace('/app')
    }
  }, [accessToken, router])

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-8">
      <p className="text-muted-foreground text-center">Halaman Scan belum tersedia.</p>
      <Button asChild>
        <Link href="/app">Kembali ke Dashboard</Link>
      </Button>
    </div>
  )
}
