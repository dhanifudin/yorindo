'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface StandardValue {
  id: string
  slug: string
  name: string
}

interface StandardValuesManagerProps {
  endpoint: string
  title: string
  description: string
  label: string
}

async function fetchStandardValues(endpoint: string): Promise<StandardValue[]> {
  const res = await fetch(`/api${endpoint}`)
  if (!res.ok) throw new Error('Failed to fetch')
  const data = await res.json()
  return data.data ?? []
}

async function createStandardValue(endpoint: string, name: string, slug: string): Promise<StandardValue> {
  const res = await fetch(`/api${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, slug }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message ?? 'Gagal menambah data')
  }
  return res.json()
}

async function updateStandardValue(endpoint: string, id: string, name: string, slug: string): Promise<StandardValue> {
  const res = await fetch(`/api${endpoint}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, slug }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message ?? 'Gagal memperbarui data')
  }
  return res.json()
}

async function deleteStandardValue(endpoint: string, id: string): Promise<void> {
  const res = await fetch(`/api${endpoint}/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Gagal menghapus data')
}

export function StandardValuesManager({ endpoint, title, description, label }: StandardValuesManagerProps) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<StandardValue | null>(null)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { data: items, isLoading } = useQuery<StandardValue[]>({
    queryKey: ['standard-values', endpoint],
    queryFn: () => fetchStandardValues(endpoint),
    staleTime: 60_000,
  })

  const resetForm = () => {
    setName('')
    setSlug('')
    setEditing(null)
  }

  const handleOpen = (item?: StandardValue) => {
    if (item) {
      setEditing(item)
      setName(item.name)
      setSlug(item.slug)
    } else {
      resetForm()
    }
    setOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !slug.trim()) return

    setIsSubmitting(true)
    try {
      if (editing) {
        await updateStandardValue(endpoint, editing.id, name, slug)
        toast.success(`${label} berhasil diperbarui`)
      } else {
        await createStandardValue(endpoint, name, slug)
        toast.success(`${label} berhasil ditambahkan`)
      }
      queryClient.invalidateQueries({ queryKey: ['standard-values', endpoint] })
      resetForm()
      setOpen(false)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Terjadi kesalahan')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteStandardValue(endpoint, id)
      toast.success(`${label} berhasil dihapus`)
      queryClient.invalidateQueries({ queryKey: ['standard-values', endpoint] })
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Gagal menghapus')
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm() }}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={() => handleOpen()}>
                <Plus className="w-4 h-4 mr-1" />
                Tambah
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editing ? 'Edit' : 'Tambah'} {label}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="sv-name">Nama</Label>
                  <Input
                    id="sv-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={`Contoh: Teknologi Informasi`}
                  />
                </div>
                <div>
                  <Label htmlFor="sv-slug">Slug</Label>
                  <Input
                    id="sv-slug"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                    placeholder="teknologi-informasi"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    Batal
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                    {editing ? 'Simpan' : 'Tambah'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-10 bg-muted rounded animate-pulse" />
            ))}
          </div>
        ) : items?.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Belum ada {label.toLowerCase()}. Tambahkan untuk memulai.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead className="w-[120px]">Slug</TableHead>
                <TableHead className="w-[100px] text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items?.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{item.slug}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleOpen(item)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
