import { useQuery } from '@tanstack/react-query'

export interface StandardIndustry {
  id: string
  slug: string
  name: string
}

export interface StandardJobTitle {
  id: string
  slug: string
  name: string
}

async function fetchIndustries(): Promise<StandardIndustry[]> {
  const res = await fetch('/api/industries')
  if (!res.ok) throw new Error('Failed to fetch industries')
  const data = await res.json()
  return data.data ?? []
}

async function fetchJobTitles(): Promise<StandardJobTitle[]> {
  const res = await fetch('/api/job-titles')
  if (!res.ok) throw new Error('Failed to fetch job titles')
  const data = await res.json()
  return data.data ?? []
}

export function useIndustries() {
  return useQuery<StandardIndustry[]>({
    queryKey: ['standard-industries'],
    queryFn: fetchIndustries,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export function useJobTitles() {
  return useQuery<StandardJobTitle[]>({
    queryKey: ['standard-job-titles'],
    queryFn: fetchJobTitles,
    staleTime: 5 * 60 * 1000,
  })
}
