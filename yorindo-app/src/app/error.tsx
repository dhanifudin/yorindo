'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <div className="flex min-h-screen items-center justify-center p-8 text-center">
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Terjadi kesalahan</h2>
        <p className="text-sm text-muted-foreground">
          Silakan coba lagi atau hubungi administrator.
        </p>
        <button
          onClick={reset}
          className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
        >
          Coba lagi
        </button>
      </div>
    </div>
  )
}
