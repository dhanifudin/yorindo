'use client'

import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { RefreshCw, CheckCircle2, Loader2 } from 'lucide-react'
import { useIndustries, useJobTitles } from '@/hooks/useStandardValues'

interface UnmatchedContact {
  id: string
  name: string
  phone: string | null
  email: string | null
  service_type: string | null
  job_title: string | null
  company: string | null
  created_at: string
}

interface UnmatchedResponse {
  contacts: UnmatchedContact[]
  total: number
  totalPages: number
}

async function scanUnmatched(): Promise<{ industryCount: number; jobTitleCount: number }> {
  const res = await fetch('/api/contacts/scan-unmatched', { method: 'POST' })
  if (!res.ok) throw new Error('Gagal memindai kontak')
  return res.json()
}

async function getUnmatchedContacts(type: string, page = 1): Promise<UnmatchedResponse> {
  const res = await fetch(`/api/contacts/unmatched?type=${type}&page=${page}&pageSize=50`)
  if (!res.ok) throw new Error('Gagal memuat kontak')
  return res.json()
}

async function bulkNormalize(contactIds: string[], field: 'serviceType' | 'jobTitle', standardId: string): Promise<{ normalized: number }> {
  const res = await fetch('/api/contacts/bulk-normalize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contactIds, field, standardId }),
  })
  if (!res.ok) throw new Error('Gagal menormalisasi kontak')
  return res.json()
}

export function ContactNormalizationTab({ defaultTab }: { defaultTab: 'industry' | 'jobtitle' }) {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'industry' | 'jobtitle'>(defaultTab)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkValue, setBulkValue] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    setActiveTab(defaultTab)
    setPage(1)
    setSelectedIds(new Set())
    setBulkValue('')
  }, [defaultTab])

  // Standard values
  const { data: industries } = useIndustries()
  const { data: jobTitles } = useJobTitles()

  // Industry options for combobox
  const industryOptions = useMemo(() =>
    industries?.map(ind => ({ value: ind.id, label: ind.name })) ?? [],
    [industries]
  )

  // Job title options for combobox
  const jobTitleOptions = useMemo(() =>
    jobTitles?.map(jt => ({ value: jt.id, label: jt.name })) ?? [],
    [jobTitles]
  )

  // Fetch unmatched contacts
  const typeParam = activeTab === 'industry' ? 'industry-unmatched' : 'jobtitle-unmatched'
  const { data: unmatchedData, isLoading } = useQuery<UnmatchedResponse>({
    queryKey: ['unmatched-contacts', typeParam, page],
    queryFn: () => getUnmatchedContacts(typeParam, page),
    staleTime: 30_000,
  })

  // Scan mutation
  const scanMutation = useMutation({
    mutationFn: scanUnmatched,
    onSuccess: (result) => {
      toast.success(`Pemindaian selesai: ${result.industryCount} industri, ${result.jobTitleCount} jabatan tidak cocok`)
      queryClient.invalidateQueries({ queryKey: ['unmatched-contacts'] })
    },
    onError: () => toast.error('Gagal memindai kontak'),
  })

  // Bulk normalize mutation
  const bulkMutation = useMutation({
    mutationFn: ({ contactIds, field, standardId }: { contactIds: string[]; field: 'serviceType' | 'jobTitle'; standardId: string }) =>
      bulkNormalize(contactIds, field, standardId),
    onSuccess: (result) => {
      toast.success(`${result.normalized} kontak berhasil dinormalisasi`)
      setSelectedIds(new Set())
      setBulkValue('')
      queryClient.invalidateQueries({ queryKey: ['unmatched-contacts'] })
    },
    onError: () => toast.error('Gagal menormalisasi kontak'),
  })

  const contacts = unmatchedData?.contacts ?? []
  const total = unmatchedData?.total ?? 0
  const totalPages = unmatchedData?.totalPages ?? 1

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(contacts.map(c => c.id)))
    } else {
      setSelectedIds(new Set())
    }
  }

  const handleSelectOne = (id: string, checked: boolean) => {
    const next = new Set(selectedIds)
    if (checked) next.add(id)
    else next.delete(id)
    setSelectedIds(next)
  }

  const handleBulkNormalize = () => {
    if (selectedIds.size === 0 || !bulkValue) return
    const field = activeTab === 'industry' ? 'serviceType' : 'jobTitle'
    bulkMutation.mutate({ contactIds: Array.from(selectedIds), field, standardId: bulkValue })
  }

  const handleScan = () => {
    scanMutation.mutate()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Tinjau dan sesuaikan industri/jabatan kontak dengan standar
        </p>
        <Button onClick={handleScan} disabled={scanMutation.isPending}>
          {scanMutation.isPending ? (
            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4 mr-1" />
          )}
          Pindai Kontak
        </Button>
      </div>

      <Tabs value={activeTab}>
        <TabsList>
          <TabsTrigger value="industry">Industri Tidak Cocok</TabsTrigger>
          <TabsTrigger value="jobtitle">Jabatan Tidak Cocok</TabsTrigger>
        </TabsList>

        <TabsContent value="industry" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Kontak dengan Industri Tidak Standar</CardTitle>
              <CardDescription>
                {total} kontak memiliki industri yang tidak cocok dengan standar
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-10 bg-muted rounded animate-pulse" />
                  ))}
                </div>
              ) : contacts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Tidak ada kontak dengan industri tidak standar.
                </p>
              ) : (
                <>
                  {/* Bulk action bar */}
                  {selectedIds.size > 0 && (
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg mb-4">
                      <span className="text-sm text-muted-foreground">{selectedIds.size} dipilih</span>
                      <Combobox
                        options={industryOptions}
                        value={bulkValue}
                        onValueChange={setBulkValue}
                        placeholder="Pilih industri standar..."
                        searchPlaceholder="Cari industri..."
                        emptyText="Industri tidak ditemukan."
                      />
                      <Button size="sm" onClick={handleBulkNormalize} disabled={!bulkValue || bulkMutation.isPending}>
                        {bulkMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
                        Normalisasi
                      </Button>
                    </div>
                  )}

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[40px]">
                          <Checkbox
                            checked={selectedIds.size === contacts.length && contacts.length > 0}
                            onCheckedChange={handleSelectAll}
                          />
                        </TableHead>
                        <TableHead>Nama</TableHead>
                        <TableHead>Perusahaan</TableHead>
                        <TableHead>Industri Saat Ini</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contacts.map((contact) => (
                        <TableRow key={contact.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedIds.has(contact.id)}
                              onCheckedChange={(checked) => handleSelectOne(contact.id, checked as boolean)}
                            />
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm">{contact.name}</p>
                              {contact.email && <p className="text-xs text-muted-foreground">{contact.email}</p>}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{contact.company ?? '-'}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {contact.service_type ?? '-'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4">
                      <p className="text-sm text-muted-foreground">
                        Halaman {page} dari {totalPages}
                      </p>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                          Sebelumnya
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                          Berikutnya
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="jobtitle" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Kontak dengan Jabatan Tidak Standar</CardTitle>
              <CardDescription>
                {total} kontak memiliki jabatan yang tidak cocok dengan standar
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-10 bg-muted rounded animate-pulse" />
                  ))}
                </div>
              ) : contacts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Tidak ada kontak dengan jabatan tidak standar.
                </p>
              ) : (
                <>
                  {/* Bulk action bar */}
                  {selectedIds.size > 0 && (
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg mb-4">
                      <span className="text-sm text-muted-foreground">{selectedIds.size} dipilih</span>
                      <Combobox
                        options={jobTitleOptions}
                        value={bulkValue}
                        onValueChange={setBulkValue}
                        placeholder="Pilih jabatan standar..."
                        searchPlaceholder="Cari jabatan..."
                        emptyText="Jabatan tidak ditemukan."
                      />
                      <Button size="sm" onClick={handleBulkNormalize} disabled={!bulkValue || bulkMutation.isPending}>
                        {bulkMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
                        Normalisasi
                      </Button>
                    </div>
                  )}

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[40px]">
                          <Checkbox
                            checked={selectedIds.size === contacts.length && contacts.length > 0}
                            onCheckedChange={handleSelectAll}
                          />
                        </TableHead>
                        <TableHead>Nama</TableHead>
                        <TableHead>Perusahaan</TableHead>
                        <TableHead>Jabatan Saat Ini</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contacts.map((contact) => (
                        <TableRow key={contact.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedIds.has(contact.id)}
                              onCheckedChange={(checked) => handleSelectOne(contact.id, checked as boolean)}
                            />
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm">{contact.name}</p>
                              {contact.email && <p className="text-xs text-muted-foreground">{contact.email}</p>}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{contact.company ?? '-'}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {contact.job_title ?? '-'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4">
                      <p className="text-sm text-muted-foreground">
                        Halaman {page} dari {totalPages}
                      </p>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                          Sebelumnya
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                          Berikutnya
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
