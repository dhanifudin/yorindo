'use client'

import { useState, useMemo, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Combobox } from '@/components/ui/combobox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'
import { RefreshCw, CheckCircle2, Loader2, ChevronDown, ChevronUp, Users, Plus } from 'lucide-react'
import { useIndustries, useJobTitles } from '@/hooks/useStandardValues'

interface Contact {
  id: string
  name: string
  email: string | null
  serviceType: string | null
  jobTitle: string | null
}

interface ContactsResponse {
  data: Contact[]
  pagination: { total: number; page: number; pageSize: number; totalPages: number }
}

async function fetchContacts(page = 1): Promise<ContactsResponse> {
  const res = await fetch(`/api/contacts?page=${page}&pageSize=100`)
  if (!res.ok) throw new Error('Gagal memuat kontak')
  return res.json()
}

async function fetchAllContacts(): Promise<Contact[]> {
  const allContacts: Contact[] = []
  let page = 1
  let totalPages = 1

  while (page <= totalPages) {
    const data = await fetchContacts(page)
    allContacts.push(...data.data)
    totalPages = data.pagination.totalPages
    page++
  }

  return allContacts
}

interface GroupedValue {
  value: string
  count: number
  contactIds: string[]
  contacts: Contact[]
}

export function ContactNormalizationTab() {
  const queryClient = useQueryClient()
  const [activeType, setActiveType] = useState<'serviceType' | 'jobTitle'>('serviceType')
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [newValues, setNewValues] = useState<Record<string, string>>({})
  const [expandedValue, setExpandedValue] = useState<string | null>(null)

  const { data: industries, isLoading: industriesLoading } = useIndustries()
  const { data: jobTitles, isLoading: jobTitlesLoading } = useJobTitles()

  const { data: contacts, isLoading: contactsLoading, error: contactsError } = useQuery<Contact[]>({
    queryKey: ['contacts-for-normalization'],
    queryFn: fetchAllContacts,
    staleTime: 60_000,
  })

  // Group contacts by non-standard values
  const nonStandardGroups = useMemo(() => {
    if (!contacts) return []

    const standards = activeType === 'serviceType'
      ? (industries?.map(i => i.name.toLowerCase()) ?? [])
      : (jobTitles?.map(j => j.name.toLowerCase()) ?? [])

    const groups: Record<string, GroupedValue> = {}

    for (const contact of contacts) {
      const value = contact[activeType]
      // Skip empty values or values that match standards
      if (!value || value.trim() === '' || standards.includes(value.toLowerCase())) continue

      if (!groups[value]) {
        groups[value] = { value, count: 0, contactIds: [], contacts: [] }
      }
      groups[value].count++
      groups[value].contactIds.push(contact.id)
      groups[value].contacts.push(contact)
    }

    return Object.values(groups).sort((a, b) => b.count - a.count)
  }, [contacts, industries, jobTitles, activeType])

  const standardOptions = useMemo(() => {
    const items = activeType === 'serviceType' ? industries : jobTitles
    return items?.map(item => ({ value: item.id, label: item.name })) ?? []
  }, [industries, jobTitles, activeType])

  const applyMutation = useMutation({
    mutationFn: async () => {
      const promises: Promise<unknown>[] = []

      // Apply mappings to existing standards
      for (const [nonStandardValue, standardId] of Object.entries(mapping)) {
        const group = nonStandardGroups.find(g => g.value === nonStandardValue)
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
        promises.push(res.json())
      }

      // Add new standard values and map contacts
      for (const [newValue, label] of Object.entries(newValues)) {
        const endpoint = activeType === 'serviceType' ? '/api/industries' : '/api/job-titles'
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: label, slug: label.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') }),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.error?.message ?? `Gagal menambahkan ${activeType === 'serviceType' ? 'industri' : 'jabatan'} baru`)
        }
        const data = await res.json()

        // Normalize contacts to the new standard
        const group = nonStandardGroups.find(g => g.value === newValue)
        if (group && group.contactIds.length > 0) {
          await fetch('/api/contacts/bulk-normalize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contactIds: group.contactIds, field: activeType, standardId: data.id }),
          })
        }
        promises.push(Promise.resolve())
      }

      await Promise.all(promises)
    },
    onSuccess: () => {
      toast.success('Normalisasi berhasil diterapkan')
      queryClient.invalidateQueries({ queryKey: ['contacts-for-normalization'] })
      queryClient.invalidateQueries({ queryKey: activeType === 'serviceType' ? ['standard-industries'] : ['standard-job-titles'] })
      setMapping({})
      setNewValues({})
    },
    onError: (err: Error) => toast.error(err.message ?? 'Gagal menormalisasi kontak'),
  })

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['contacts-for-normalization'] })
  }

  const toggleExpand = useCallback((value: string) => {
    setExpandedValue(prev => prev === value ? null : value)
  }, [])

  const addAsNewStandard = useCallback((value: string) => {
    setNewValues(prev => ({ ...prev, [value]: value }))
    setMapping(prev => { const next = { ...prev }; delete next[value]; return next })
  }, [])

  const setMappingForValue = (value: string, standardId: string) => {
    setMapping(prev => ({ ...prev, [value]: standardId }))
    setNewValues(prev => { const next = { ...prev }; delete next[value]; return next })
  }

  const setNewValueForValue = (value: string, label: string) => {
    setNewValues(prev => ({ ...prev, [value]: label }))
    setMapping(prev => { const next = { ...prev }; delete next[value]; return next })
  }

  const isLoading = contactsLoading || industriesLoading || jobTitlesLoading
  const hasChanges = Object.keys(mapping).length > 0 || Object.keys(newValues).length > 0
  const label = activeType === 'serviceType' ? 'Industri' : 'Jabatan'

  if (contactsError) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-red-600">
          Gagal memuat kontak: {contactsError.message}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {nonStandardGroups.length} nilai {label.toLowerCase()} tidak standar ditemukan dari {contacts?.length ?? 0} kontak
        </p>
        <div className="flex items-center gap-2">
          <Select value={activeType} onValueChange={(v) => { setActiveType(v as typeof activeType); setMapping({}); setNewValues({}) }}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="serviceType">Industri</SelectItem>
              <SelectItem value="jobTitle">Jabatan</SelectItem>
            </SelectContent>
          </Select>
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
      ) : nonStandardGroups.length === 0 ? (
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
            {nonStandardGroups.map((group) => {
              const isExpanded = expandedValue === group.value
              const isMapped = !!mapping[group.value]
              const isNew = !!newValues[group.value]

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
                        <div className="flex items-center gap-2 flex-1 sm:flex-none">
                          {isMapped ? (
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                              <Badge className="bg-green-100 text-green-700 text-xs">
                                Dipetakan ke: {industries?.find(i => i.id === mapping[group.value])?.name ?? jobTitles?.find(j => j.id === mapping[group.value])?.name}
                              </Badge>
                              <Button variant="ghost" size="sm" onClick={() => setMapping(prev => { const next = { ...prev }; delete next[group.value]; return next })}>
                                Batal
                              </Button>
                            </div>
                          ) : isNew ? (
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                              <Badge className="bg-blue-100 text-blue-700 text-xs">
                                <Plus className="w-3 h-3 mr-1" />
                                Baru: {newValues[group.value]}
                              </Badge>
                              <Button variant="ghost" size="sm" onClick={() => setNewValues(prev => { const next = { ...prev }; delete next[group.value]; return next })}>
                                Batal
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                              <Combobox
                                options={standardOptions}
                                value=""
                                onValueChange={(v) => setMappingForValue(group.value, v)}
                                placeholder="Pilih standar..."
                                searchPlaceholder="Cari..."
                                emptyText="Tidak ditemukan."
                              />
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => addAsNewStandard(group.value)}
                                title="Tambahkan sebagai standar baru"
                              >
                                <Plus className="w-4 h-4" />
                              </Button>
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
                                      {contact[activeType]}
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
        </>
      )}
    </div>
  )
}
