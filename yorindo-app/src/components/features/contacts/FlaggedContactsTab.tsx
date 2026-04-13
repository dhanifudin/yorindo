'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
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
import { Loader2, AlertCircle } from 'lucide-react'
import type { Contact } from '@/types/api'

const PAGE_SIZE = 20

type ReviewFilter = 'invalid-data' | 'missingEmail' | 'missingPhone'

const FILTER_CONFIG: Record<ReviewFilter, { label: string; apiParam: string }> = {
  'invalid-data': { label: 'Perlu Tinjauan', apiParam: 'flagged' },
  missingEmail: { label: 'Email Kosong', apiParam: 'missingEmail' },
  missingPhone: { label: 'Telepon Kosong', apiParam: 'missingPhone' },
}

export function FlaggedContactsTab() {
  const queryClient = useQueryClient()
  const [activeFilter, setActiveFilter] = useState<ReviewFilter>('invalid-data')
  const [page, setPage] = useState(0)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editState, setEditState] = useState<{
    phone: string
    email: string
    city: string
    company: string
    serviceType: string
    jobTitle: string
  } | null>(null)

  const { data, isLoading } = useQuery<{ data: Contact[]; pagination: { total: number } }>({
    queryKey: ['review-contacts', activeFilter, page],
    queryFn: () => {
      const apiParam = FILTER_CONFIG[activeFilter].apiParam
      return fetch(`/api/contacts?${apiParam}=true&page=${page + 1}&pageSize=${PAGE_SIZE}`).then((r) => r.json())
    },
    staleTime: 30_000,
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Contact> }) => {
      const res = await fetch(`/api/contacts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error?.message ?? 'Gagal memperbarui kontak')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('Kontak berhasil diperbarui')
      queryClient.invalidateQueries({ queryKey: ['review-contacts', activeFilter, page] })
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
      queryClient.invalidateQueries({ queryKey: ['contacts-health'] })
      setEditingId(null)
      setEditState(null)
    },
    onError: (err: Error) => toast.error(err.message ?? 'Gagal memperbarui kontak'),
  })

  const normalizePhone = (phone: string): string | null => {
    const trimmed = phone.trim()
    if (!trimmed) return null
    const digits = trimmed.replace(/\D/g, '')
    if (digits.startsWith('0')) return `+62${digits.slice(1)}`
    if (digits.startsWith('62')) return `+${digits}`
    if (digits.startsWith('8')) return `+62${digits}`
    return trimmed
  }

  const handleEdit = (contact: Contact) => {
    setEditingId(contact.id)
    setEditState({
      phone: contact.phone ?? '',
      email: contact.email ?? '',
      city: contact.city ?? '',
      company: contact.company ?? '',
      serviceType: contact.serviceType ?? '',
      jobTitle: contact.jobTitle ?? '',
    })
  }

  const handleSave = (id: string) => {
    if (!editState) return
    updateMutation.mutate({
      id,
      data: {
        phone: normalizePhone(editState.phone),
        email: editState.email.trim() || undefined,
        city: editState.city.trim() || undefined,
        company: editState.company.trim() || undefined,
        serviceType: editState.serviceType.trim() || undefined,
        jobTitle: editState.jobTitle.trim() || undefined,
      } as Partial<Contact>,
    })
  }

  const handleCancel = () => {
    setEditingId(null)
    setEditState(null)
  }

  const contacts = data?.data ?? []
  const filteredContacts = useMemo(() => {
    if (activeFilter === 'invalid-data') {
      return contacts.filter(c => c.flagCategory !== 'duplicate')
    }
    return contacts
  }, [contacts, activeFilter])

  const total = filteredContacts.length > 0 ? (data?.pagination.total ?? 0) : 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  const fieldLabels: Record<string, string> = {
    phone: 'Telepon',
    email: 'Email',
    city: 'Kota',
    company: 'Perusahaan',
    serviceType: 'Industri',
    jobTitle: 'Jabatan',
  }

  const getMissingFields = (contact: Contact): string[] => {
    const fields: string[] = []
    if (!contact.phone) fields.push('phone')
    if (!contact.email) fields.push('email')
    if (activeFilter === 'invalid-data' && contact.flagCategory === 'invalid-data') {
      // For invalid-data, show all editable fields
      return ['phone', 'email', 'city', 'company', 'serviceType', 'jobTitle']
    }
    return fields
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {total} kontak
          {activeFilter === 'invalid-data' && ' perlu tinjauan'}
          {activeFilter === 'missingEmail' && ' email kosong'}
          {activeFilter === 'missingPhone' && ' telepon kosong'}
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(Object.keys(FILTER_CONFIG) as ReviewFilter[]).map((filter) => (
          <button
            key={filter}
            type="button"
            onClick={() => { setActiveFilter(filter); setPage(0); setEditingId(null) }}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              activeFilter === filter
                ? 'border-orange-300 bg-orange-50 text-orange-700'
                : 'border-border text-muted-foreground hover:bg-muted'
            }`}
          >
            {FILTER_CONFIG[filter].label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-lg" />
          ))}
        </div>
      ) : filteredContacts.length === 0 ? (
        <p className="text-muted-foreground text-center py-12">
          {activeFilter === 'invalid-data'
            ? 'Semua kontak sudah normal'
            : activeFilter === 'missingEmail'
              ? 'Semua kontak memiliki email'
              : 'Semua kontak memiliki telepon'}
        </p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Telepon</TableHead>
                <TableHead className="hidden md:table-cell">Email</TableHead>
                <TableHead className="hidden lg:table-cell">Kota</TableHead>
                <TableHead className="w-[200px] text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredContacts.map((contact) => {
                const isEditing = editingId === contact.id
                const missingFields = getMissingFields(contact)
                const hasInvalidData = contact.flagCategory === 'invalid-data'

                return (
                  <TableRow key={contact.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{contact.name}</p>
                        {hasInvalidData && (
                          <Badge variant="outline" className="text-[10px] mt-1 bg-yellow-100 text-yellow-700 border-yellow-200">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Data Invalid
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Input
                          value={editState?.phone ?? ''}
                          onChange={(e) => setEditState((prev) => prev ? { ...prev, phone: e.target.value } : null)}
                          placeholder="Telepon..."
                          className={`h-8 ${missingFields.includes('phone') ? 'border-orange-300 bg-orange-50/50' : ''}`}
                        />
                      ) : (
                        <span className={`text-sm ${missingFields.includes('phone') ? 'text-orange-600' : ''}`}>
                          {contact.phone || <span className="text-muted-foreground italic">— kosong</span>}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {isEditing ? (
                        <Input
                          value={editState?.email ?? ''}
                          onChange={(e) => setEditState((prev) => prev ? { ...prev, email: e.target.value } : null)}
                          placeholder="Email..."
                          className={`h-8 ${missingFields.includes('email') ? 'border-orange-300 bg-orange-50/50' : ''}`}
                        />
                      ) : (
                        <span className={`text-sm ${missingFields.includes('email') ? 'text-orange-600' : ''}`}>
                          {contact.email || <span className="text-muted-foreground italic">— kosong</span>}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {isEditing ? (
                        <Input
                          value={editState?.city ?? ''}
                          onChange={(e) => setEditState((prev) => prev ? { ...prev, city: e.target.value } : null)}
                          placeholder="Kota..."
                          className="h-8"
                        />
                      ) : (
                        <span className="text-sm">{contact.city || <span className="text-muted-foreground italic">—</span>}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        {isEditing ? (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleCancel}
                              disabled={updateMutation.isPending}
                              className="h-7"
                            >
                              Batal
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleSave(contact.id)}
                              disabled={updateMutation.isPending}
                              className="h-7"
                            >
                              {updateMutation.isPending ? (
                                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                              ) : null}
                              Simpan
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(contact)}
                            className="h-7"
                          >
                            Perbarui
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <TablePagination
          page={page}
          pageSize={PAGE_SIZE}
          total={total}
          onPrev={() => setPage((p) => Math.max(0, p - 1))}
          onNext={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
          onPageChange={(p) => setPage(p)}
        />
      )}
    </div>
  )
}
