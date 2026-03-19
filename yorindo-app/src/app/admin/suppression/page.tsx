'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card } from '@/components/ui/card'
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'

interface SuppressionEntry {
  id: string
  name: string
  email: string
  phone: string
  suppressedAt: string
  reason: string
}

export default function SuppressionPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [addEmail, setAddEmail] = useState('')
  const [addPhone, setAddPhone] = useState('')

  const debounceSearch = (val: string) => {
    setSearch(val)
    clearTimeout((debounceSearch as unknown as { _t?: ReturnType<typeof setTimeout> })._t)
    const t = setTimeout(() => setDebouncedSearch(val), 400)
    ;(debounceSearch as unknown as { _t?: ReturnType<typeof setTimeout> })._t = t
  }

  const { data, isLoading } = useQuery<{ data: SuppressionEntry[]; pagination: { total: number } }>({
    queryKey: ['suppression', debouncedSearch],
    queryFn: () =>
      fetch(`/api/contacts/suppression?q=${encodeURIComponent(debouncedSearch)}&pageSize=50`).then((r) => r.json()),
  })

  const addMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/contacts/suppression', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: addEmail, phone: addPhone, reason: 'manually_added' }),
      })
      if (!res.ok) throw new Error('Gagal menambah')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppression'] })
      toast.success('Kontak ditambahkan ke suppression list')
      setAddOpen(false)
      setAddEmail('')
      setAddPhone('')
    },
    onError: () => toast.error('Gagal menambah kontak'),
  })

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/contacts/suppression/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Gagal menghapus')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppression'] })
      toast.success('Kontak dihapus dari suppression list')
    },
    onError: () => toast.error('Gagal menghapus kontak'),
  })

  const REASON_LABEL: Record<string, string> = {
    unsubscribed: 'Unsubscribe',
    erasure_request: 'Permintaan Hapus Data',
    manually_added: 'Ditambahkan Manual',
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Suppression List</h1>
        <Button onClick={() => setAddOpen(true)}>+ Tambah Manual</Button>
      </div>

      <div className="mb-4">
        <Input
          value={search}
          onChange={(e) => debounceSearch(e.target.value)}
          placeholder="Cari email atau telepon..."
          className="max-w-sm"
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 bg-muted rounded animate-pulse" />
          ))}
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Telepon</TableHead>
                <TableHead>Alasan</TableHead>
                <TableHead>Ditambahkan</TableHead>
                <TableHead>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!data?.data.length ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Tidak ada kontak dalam suppression list
                  </TableCell>
                </TableRow>
              ) : (
                data.data.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium">{entry.name}</TableCell>
                    <TableCell className="text-muted-foreground">{entry.email}</TableCell>
                    <TableCell className="text-muted-foreground">{entry.phone}</TableCell>
                    <TableCell>
                      <Badge className="bg-muted text-muted-foreground text-xs">
                        {REASON_LABEL[entry.reason] ?? entry.reason}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(entry.suppressedAt).toLocaleDateString('id-ID')}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => removeMutation.mutate(entry.id)}
                        disabled={removeMutation.isPending}
                      >
                        Hapus
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog open={addOpen} onOpenChange={(v) => !v && setAddOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah ke Suppression List</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Email</label>
              <Input
                value={addEmail}
                onChange={(e) => setAddEmail(e.target.value)}
                placeholder="email@contoh.com"
                type="email"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Telepon</label>
              <Input
                value={addPhone}
                onChange={(e) => setAddPhone(e.target.value)}
                placeholder="+628..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Batal</Button>
            <Button
              onClick={() => addMutation.mutate()}
              disabled={(!addEmail && !addPhone) || addMutation.isPending}
            >
              Tambah
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
