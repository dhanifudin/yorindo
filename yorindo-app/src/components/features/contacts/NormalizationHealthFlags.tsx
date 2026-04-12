'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, ArrowRight, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface NormalizationCounts {
  industryUnmatched: number
  jobtitleUnmatched: number
}

async function fetchNormalizationCounts(): Promise<NormalizationCounts> {
  // Fetch counts for both types
  const [industryRes, jobtitleRes] = await Promise.all([
    fetch('/api/contacts/unmatched?type=industry-unmatched&page=1&pageSize=1'),
    fetch('/api/contacts/unmatched?type=jobtitle-unmatched&page=1&pageSize=1'),
  ])

  const industryData = industryRes.ok ? await industryRes.json() : { total: 0 }
  const jobtitleData = jobtitleRes.ok ? await jobtitleRes.json() : { total: 0 }

  return {
    industryUnmatched: industryData.total ?? 0,
    jobtitleUnmatched: jobtitleData.total ?? 0,
  }
}

export function NormalizationHealthFlags({ onNavigate }: { onNavigate: (type: 'industry' | 'jobtitle') => void }) {
  const queryClient = useQueryClient()
  const { data, isLoading, isFetching } = useQuery<NormalizationCounts>({
    queryKey: ['normalization-counts'],
    queryFn: fetchNormalizationCounts,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  })

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['normalization-counts'] })
  }

  if (isLoading) return null

  const total = (data?.industryUnmatched ?? 0) + (data?.jobtitleUnmatched ?? 0)
  if (total === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex flex-wrap gap-3 flex-1">
        {/* Industry unmatched */}
      {data && data.industryUnmatched > 0 && (
        <button
          onClick={() => onNavigate('industry')}
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors text-left',
            data.industryUnmatched > 50
              ? 'border-orange-200 bg-orange-50 hover:bg-orange-100'
              : 'border-yellow-200 bg-yellow-50 hover:bg-yellow-100'
          )}
        >
          <AlertCircle className={cn(
            'w-4 h-4 shrink-0',
            data.industryUnmatched > 50 ? 'text-orange-600' : 'text-yellow-600'
          )} />
          <div>
            <p className={cn(
              'text-sm font-medium',
              data.industryUnmatched > 50 ? 'text-orange-700' : 'text-yellow-700'
            )}>
              {data.industryUnmatched} industri tidak standar
            </p>
            <p className="text-xs text-muted-foreground">Perlu normalisasi</p>
          </div>
          <ArrowRight className="w-4 h-4 ml-2 text-muted-foreground" />
        </button>
      )}

      {/* Job title unmatched */}
      {data && data.jobtitleUnmatched > 0 && (
        <button
          onClick={() => onNavigate('jobtitle')}
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors text-left',
            data.jobtitleUnmatched > 50
              ? 'border-orange-200 bg-orange-50 hover:bg-orange-100'
              : 'border-yellow-200 bg-yellow-50 hover:bg-yellow-100'
          )}
        >
          <AlertCircle className={cn(
            'w-4 h-4 shrink-0',
            data.jobtitleUnmatched > 50 ? 'text-orange-600' : 'text-yellow-600'
          )} />
          <div>
            <p className={cn(
              'text-sm font-medium',
              data.jobtitleUnmatched > 50 ? 'text-orange-700' : 'text-yellow-700'
            )}>
              {data.jobtitleUnmatched} jabatan tidak standar
            </p>
            <p className="text-xs text-muted-foreground">Perlu normalisasi</p>
          </div>
          <ArrowRight className="w-4 h-4 ml-2 text-muted-foreground" />
        </button>
      )}
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleRefresh}
        disabled={isFetching}
        className="shrink-0"
        title="Refresh"
      >
        <RefreshCw className={cn('w-4 h-4', isFetching && 'animate-spin')} />
      </Button>
    </div>
  )
}
