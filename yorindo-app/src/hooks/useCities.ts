'use client'

import { useQuery } from '@tanstack/react-query'

interface City {
  city_code: string
  city_name: string
  province_name: string
}

export function useCities() {
  return useQuery<City[]>({
    queryKey: ['cities'],
    queryFn: async () => {
      const res = await fetch('/api/cities')
      if (!res.ok) throw new Error('Failed to fetch cities')
      const data = await res.json()
      return data.data ?? []
    },
    staleTime: 5 * 60 * 1000,
  })
}
