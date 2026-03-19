'use client'
import { useEffect, useState } from 'react'

const MOCKS_ENABLED =
  process.env.NODE_ENV === 'development' ||
  process.env.NEXT_PUBLIC_ENABLE_MOCKS === 'true'

export function MSWProvider({ children }: { children: React.ReactNode }) {
  const [mswReady, setMswReady] = useState(!MOCKS_ENABLED)

  useEffect(() => {
    if (MOCKS_ENABLED) {
      import('@/mocks/browser')
        .then(({ worker }) => worker.start({ onUnhandledRequest: 'warn' }))
        .then(() => setMswReady(true))
    }
  }, [])

  if (!mswReady) return null
  return <>{children}</>
}
