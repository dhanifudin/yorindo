'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { Save, Loader2, AlertCircle } from 'lucide-react'

interface Contact {
  id: string
  name: string
  email: string | null
  phone: string | null
  city: string | null
  company: string | null
  serviceType: string | null
  jobTitle: string | null
}

interface MissingFieldsResponse {
  data: Contact[]
  pagination: { total: number; page: number; pageSize: number; totalPages: number }
}

async function fetchMissingFields(field: string, page = 1): Promise<MissingFieldsResponse> {
  const param = field === 'email' ? 'missingEmail' : 'missingPhone'
  const res = await fetch(`/api/contacts?${param}=true&page=${page}&pageSize=50`)
  if (!res.ok) throw new Error('Gagal memuat kontak')
  return res.json()
}

async function updateContact(id: string, data: Partial<Contact>) {
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
}

export function MissingFieldsTab() {
  const queryClient = useQueryClient()
  const [activeField, setActiveField] = useState<'email' | 'phone'>('email')
  const [page, setPage] = useState(1)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  const { data, isLoading } = useQuery<MissingFieldsResponse>({
    queryKey: ['missing-fields', activeField, page],
    queryFn: () => fetchMissingFields(activeField, page),
    staleTime: 30_000,
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Contact> }) => updateContact(id, data),
    onSuccess: () => {
      toast.success('Kontak berhasil diperbarui')
      queryClient.invalidateQueries({ queryKey: ['missing-fields', activeField, page] })
      queryClient.invalidateQueries({ queryKey: ['contacts-health'] })
      setEditingId(null)
      setEditValue('')
    },
    onError: (err: Error) => toast.error(err.message ?? 'Gagal memperbarui kontak'),
  })

  const handleEdit = (contact: Contact) => {
    setEditingId(contact.id)
    setEditValue(contact[activeField] ?? '')
  }

  const handleSave = (id: string) => {
    updateMutation.mutate({ id, data: { [activeField]: editValue || null } as Partial<Contact> })
  }

  const handleCancel = () => {
    setEditingId(null)
    setEditValue('')
  }

  const getFieldLabel = (field: string) => {
    const labels: Record<string, string> = {
      email: 'Email',
      phone: 'Telepon',
    }
    return labels[field] ?? field
  }

  const contacts = data?.data ?? []
  const total = data?.pagination.total ?? 0
  const totalPages = data?.pagination.totalPages ?? 1

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {total} kontak dengan {getFieldLabel(activeField).toLowerCase()} kosong
        </p>
        <div className="flex items-center gap-2">
          <Select value={activeField} onValueChange={(v) => { setActiveField(v as typeof activeField); setPage(1) }}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="email">Email Kosong</SelectItem>
              <SelectItem value="phone">Telepon Kosong</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-lg" />
          ))}
        </div>
      ) : contacts.length === 0 ? (
        <p className="text-muted-foreground text-center py-12">
          Semua kontak memiliki {getFieldLabel(activeField).toLowerCase()} lengkap
        </p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>{getFieldLabel(activeField)}</TableHead>
                <TableHead className="w-[150px] text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contacts.map((contact) => {
                const isEditing = editingId === contact.id
                return (
                  <TableRow key={contact.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{contact.name}</p>
                        <p className="text-xs text-muted-foreground">{contact.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          placeholder={`Masukkan ${getFieldLabel(activeField)}...`}
                          className="h-9"
                        />
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          Kosong
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        {isEditing ? (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={handleCancel}
                              disabled={updateMutation.isPending}
                            >
                              Batal
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleSave(contact.id)}
                              disabled={updateMutation.isPending}
                            >
                              {updateMutation.isPending ? (
                                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                              ) : (
                                <Save className="w-4 h-4 mr-1" />
                              )}
                              Simpan
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(contact)}
                          >
                            Edit
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
        <div className="flex items-center justify-between">
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
    </div>
  )
}
