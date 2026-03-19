'use client'
import { useEffect, useState } from 'react'

export function MSWProvider({ children }: { children: React.ReactNode }) {
  const [mswReady, setMswReady] = useState(process.env.NODE_ENV !== 'development')

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      import('@/mocks/browser')
        .then(({ worker }) => worker.start({ onUnhandledRequest: 'warn' }))
        .then(() => setMswReady(true))
    }
  }, [])

  if (!mswReady) return null
  return <>{children}</>
}
