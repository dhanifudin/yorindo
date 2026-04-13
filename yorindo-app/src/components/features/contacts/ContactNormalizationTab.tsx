'use client'

import { useState, useMemo, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Combobox } from '@/components/ui/combobox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { TablePagination } from '@/components/ui/table-pagination'
import { toast } from 'sonner'
import { RefreshCw, CheckCircle2, Loader2, ChevronDown, ChevronUp, Users } from 'lucide-react'
import { useIndustries, useJobTitles } from '@/hooks/useStandardValues'
import { useCities } from '@/hooks/useCities'

interface Contact {
  id: string
  name: string
  email: string | null
  service_type: string | null
  job_title: string | null
  city: string | null
}

interface ContactsResponse {
  contacts: Contact[]
  total: number
  totalPages: number
}

interface CityGroup {
  city: string
  count: number
  contactIds: string[]
  contacts: { id: string; name: string; email: string | null; phone: string | null }[]
}

interface CitiesResponse {
  cityGroups: CityGroup[]
  total: number
  totalPages: number
}

async function fetchContacts(type: 'industry-unmatched' | 'jobtitle-unmatched', page = 1): Promise<ContactsResponse> {
  const res = await fetch(`/api/contacts/unmatched?type=${type}&page=${page}&pageSize=50`)
  if (!res.ok) throw new Error('Gagal memuat kontak')
  return res.json()
}

async function fetchUnmatchedCities(page = 1): Promise<CitiesResponse> {
  const res = await fetch(`/api/contacts/cities/unmatched?page=${page}&pageSize=50`)
  if (!res.ok) throw new Error('Gagal memuat kota')
  return res.json()
}

interface GroupedValue {
  value: string
  count: number
  contactIds: string[]
  contacts: Contact[]
}

type NormalizationType = 'serviceType' | 'jobTitle' | 'city'

export function ContactNormalizationTab() {
  const queryClient = useQueryClient()
  const [activeType, setActiveType] = useState<NormalizationType>('serviceType')
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [page, setPage] = useState(1)
  const [expandedValue, setExpandedValue] = useState<string | null>(null)

  const { data: industries } = useIndustries()
  const { data: jobTitles } = useJobTitles()
  const { data: cities } = useCities()

  const apiType = activeType === 'serviceType' ? 'industry-unmatched' : activeType === 'jobTitle' ? 'jobtitle-unmatched' : null

  const { data: contactsData, isLoading: contactsLoading } = useQuery<ContactsResponse>({
    queryKey: ['unmatched-contacts', apiType, page],
    queryFn: () => fetchContacts(apiType as 'industry-unmatched' | 'jobtitle-unmatched', page),
    staleTime: 30_000,
    enabled: apiType !== null,
  })

  const { data: citiesData, isLoading: citiesLoading } = useQuery<CitiesResponse>({
    queryKey: ['unmatched-cities', page],
    queryFn: () => fetchUnmatchedCities(page),
    staleTime: 30_000,
    enabled: activeType === 'city',
  })

  // Group contacts by non-standard values
  const nonStandardGroups = useMemo<GroupedValue[]>(() => {
    if (!contactsData?.contacts) return []

    const groups: Record<string, GroupedValue> = {}

    for (const contact of contactsData.contacts) {
      const value = activeType === 'serviceType' ? contact.service_type : contact.job_title
      if (!value || value.trim() === '') continue

      if (!groups[value]) {
        groups[value] = { value, count: 0, contactIds: [], contacts: [] }
      }
      groups[value].count++
      groups[value].contactIds.push(contact.id)
      groups[value].contacts.push(contact)
    }

    return Object.values(groups).sort((a, b) => b.count - a.count)
  }, [contactsData, activeType])

  const cityGroups = useMemo(() => {
    return citiesData?.cityGroups ?? []
  }, [citiesData])

  const standardOptions = useMemo(() => {
    if (activeType === 'serviceType') {
      return industries?.map(item => ({ value: item.id, label: item.name })) ?? []
    }
    if (activeType === 'jobTitle') {
      return jobTitles?.map(item => ({ value: item.id, label: item.name })) ?? []
    }
    return cities?.map(c => ({ value: c.city_name, label: c.city_name })) ?? []
  }, [activeType, industries, jobTitles, cities])

  const applyMutation = useMutation({
    mutationFn: async () => {
      if (activeType === 'city') {
        // City normalization
        for (const [oldCity, newCity] of Object.entries(mapping)) {
          const res = await fetch('/api/contacts/cities/bulk-normalize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ oldCity, newCity }),
          })
          if (!res.ok) {
            const err = await res.json().catch(() => ({}))
            throw new Error(err.error?.message ?? 'Gagal menormalisasi kota')
          }
        }
      } else {
        // Industry/Job title normalization
        for (const [nonStandardValue, standardId] of Object.entries(mapping)) {
          const group = activeType === 'serviceType'
            ? nonStandardGroups.find(g => g.value === nonStandardValue)
            : nonStandardGroups.find(g => g.value === nonStandardValue)
          if (!group) continue

          const res = await fetch('/api/contacts/bulk-normalize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contactIds: group.contactIds, field: activeType, standardId }),
          })
          if (!res.ok) {
            const err = await res.json().catch(() => ({}))
            throw new Error(err.error?.message ?? 'Gagal menormalisasi kontak')
          }
        }
      }
    },
    onSuccess: () => {
      toast.success('Normalisasi berhasil diterapkan')
      setPage(1)
      queryClient.invalidateQueries({ queryKey: activeType === 'city' ? ['unmatched-cities'] : ['unmatched-contacts', apiType] })
      queryClient.invalidateQueries({ queryKey: ['normalization-counts'] })
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
      setMapping({})
    },
    onError: (err: Error) => toast.error(err.message ?? 'Gagal menormalisasi kontak'),
  })

  const handleRefresh = () => {
    setPage(1)
    queryClient.invalidateQueries({ queryKey: activeType === 'city' ? ['unmatched-cities'] : ['unmatched-contacts', apiType] })
  }

  const toggleExpand = useCallback((value: string) => {
    setExpandedValue(prev => prev === value ? null : value)
  }, [])

  const setMappingForValue = (value: string, standardId: string) => {
    setMapping(prev => ({ ...prev, [value]: standardId }))
  }

  const removeMapping = (value: string) => {
    setMapping(prev => { const next = { ...prev }; delete next[value]; return next })
  }

  const isLoading = contactsLoading || citiesLoading
  const hasChanges = Object.keys(mapping).length > 0
  const label = activeType === 'serviceType' ? 'Industri' : activeType === 'jobTitle' ? 'Jabatan' : 'Kota'
  const currentGroups = useMemo(() => {
    if (activeType === 'city') {
      return cityGroups.map(g => ({
        value: g.city,
        count: g.count,
        contactIds: g.contactIds,
        contacts: g.contacts,
      }))
    }
    return nonStandardGroups
  }, [activeType, cityGroups, nonStandardGroups])
  const total = activeType === 'city' ? (citiesData?.total ?? 0) : (contactsData?.total ?? 0)
  const totalPages = activeType === 'city' ? (citiesData?.totalPages ?? 0) : (contactsData?.totalPages ?? 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {currentGroups.length} nilai {label.toLowerCase()} tidak standar dari {total} kontak
        </p>
        <div className="flex items-center gap-2">
          <select
            value={activeType}
            onChange={(e) => { setActiveType(e.target.value as NormalizationType); setMapping({}); setPage(1) }}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="serviceType">Industri</option>
            <option value="jobTitle">Jabatan</option>
            <option value="city">Kota</option>
          </select>
          <Button onClick={handleRefresh} disabled={isLoading} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-1" />
            Refresh
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 bg-muted rounded animate-pulse" />
          ))}
        </div>
      ) : currentGroups.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle2 className="w-12 h-12 mx-auto text-green-500 mb-3" />
            <p className="text-muted-foreground">
              Semua {label.toLowerCase()} kontak sudah sesuai dengan standar
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-3">
            {currentGroups.map((group) => {
              const isExpanded = expandedValue === group.value
              const isMapped = !!mapping[group.value]

              return (
                <Card key={group.value}>
                  <CardContent className="py-4">
                    <div className="flex flex-col gap-3">
                      {/* Header row */}
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        {/* Current value and count */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="text-sm font-medium">
                              {group.value}
                            </Badge>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {group.count} kontak
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs"
                              onClick={() => toggleExpand(group.value)}
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-3 h-3 mr-1" />
                              ) : (
                                <ChevronDown className="w-3 h-3 mr-1" />
                              )}
                              {isExpanded ? 'Sembunyikan' : 'Lihat kontak'}
                            </Button>
                          </div>
                        </div>

                        {/* Mapping options */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                          {isMapped ? (
                            <div className="flex items-center gap-2">
                              <Badge className="bg-green-100 text-green-700 text-xs">
                                Dipetakan ke: {mapping[group.value]}
                              </Badge>
                              <Button variant="ghost" size="sm" onClick={() => removeMapping(group.value)}>
                                Batal
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Combobox
                                options={standardOptions}
                                value=""
                                onValueChange={(v) => setMappingForValue(group.value, v)}
                                placeholder={`Pilih ${label.toLowerCase()}...`}
                                searchPlaceholder={`Cari ${label.toLowerCase()}...`}
                                emptyText={`Tidak ditemukan.`}
                                className="flex-1 sm:w-48"
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Expanded contact preview */}
                      {isExpanded && (
                        <div className="border rounded-lg overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Nama</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>{label}</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {group.contacts.slice(0, 10).map((contact) => (
                                <TableRow key={contact.id}>
                                  <TableCell className="font-medium">{contact.name}</TableCell>
                                  <TableCell>{contact.email ?? <span className="text-muted-foreground italic">—</span>}</TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className="text-xs">
                                      {activeType === 'serviceType'
                                        ? (contact as Contact).service_type ?? group.value
                                        : activeType === 'jobTitle'
                                          ? (contact as Contact).job_title ?? group.value
                                          : group.value}
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                          {group.contacts.length > 10 && (
                            <div className="px-4 py-2 bg-muted/50 text-xs text-muted-foreground text-center">
                              Menampilkan 10 dari {group.contacts.length} kontak
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Apply button */}
          {hasChanges && (
            <div className="flex justify-end">
              <Button onClick={() => applyMutation.mutate()} disabled={applyMutation.isPending}>
                {applyMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    Menerapkan...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                    Terapkan Normalisasi
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <TablePagination
              page={page - 1}
              pageSize={activeType === 'city' ? 50 : 50}
              total={total}
              onPrev={() => setPage(p => Math.max(1, p - 1))}
              onNext={() => setPage(p => Math.min(totalPages, p + 1))}
              onPageChange={(p) => setPage(p + 1)}
            />
          )}
        </>
      )}
    </div>
  )
}
