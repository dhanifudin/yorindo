'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { setupFetchInterceptor } from '@/lib/fetch-interceptor'

const MOCKS_ENABLED = process.env.NEXT_PUBLIC_ENABLE_MOCKS === 'true'

export function QueryProvider({ children }: { children: React.ReactNode }) {
  if (!MOCKS_ENABLED && typeof window !== 'undefined') {
    setupFetchInterceptor()
  }

  const [client] = useState(() => new QueryClient({
    defaultOptions: {
      queries: { staleTime: 30_000, retry: 1 },
    },
  }))
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
