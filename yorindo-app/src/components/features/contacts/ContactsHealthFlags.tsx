'use client'

import { useQuery } from '@tanstack/react-query'
import { AlertCircle, Mail, Phone, GitMerge, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ContactsHealth {
  duplicates: number
  missingEmail: number
  missingPhone: number
}

async function fetchHealth(): Promise<ContactsHealth> {
  const res = await fetch('/api/contacts/health')
  if (!res.ok) throw new Error('Gagal memuat kesehatan kontak')
  return res.json()
}

interface HealthFlagProps {
  icon: React.ReactNode
  label: string
  count: number
  onClick: () => void
}

function HealthFlag({ icon, label, count, onClick }: HealthFlagProps) {
  if (count === 0) return null

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-2 rounded-lg border border-yellow-200 bg-yellow-50 hover:bg-yellow-100 transition-colors text-left"
    >
      {icon}
      <div>
        <p className="text-sm font-medium text-yellow-700">{count} {label}</p>
        <p className="text-xs text-muted-foreground">Perlu ditinjau</p>
      </div>
      <ArrowRight className="w-4 h-4 ml-auto text-muted-foreground" />
    </button>
  )
}

export function ContactsHealthFlags({
  onNavigate,
}: {
  onNavigate: (view: 'flagged' | 'duplicates', field?: 'email' | 'phone') => void
}) {
  const { data, isLoading } = useQuery<ContactsHealth>({
    queryKey: ['contacts-health'],
    queryFn: fetchHealth,
    staleTime: 2 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  })

  if (isLoading) return null

  const total = (data?.duplicates ?? 0) + (data?.missingEmail ?? 0) + (data?.missingPhone ?? 0)
  if (total === 0) return null

  return (
    <div className="flex flex-wrap gap-3">
      <HealthFlag
        icon={<GitMerge className="w-4 h-4 text-yellow-600 shrink-0" />}
        label="kontak duplikat"
        count={data?.duplicates ?? 0}
        onClick={() => onNavigate('duplicates')}
      />
      <HealthFlag
        icon={<Mail className="w-4 h-4 text-yellow-600 shrink-0" />}
        label="email kosong"
        count={data?.missingEmail ?? 0}
        onClick={() => onNavigate('flagged', 'email')}
      />
      <HealthFlag
        icon={<Phone className="w-4 h-4 text-yellow-600 shrink-0" />}
        label="telepon kosong"
        count={data?.missingPhone ?? 0}
        onClick={() => onNavigate('flagged', 'phone')}
      />
    </div>
  )
}
