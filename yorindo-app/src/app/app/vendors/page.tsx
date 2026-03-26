'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { useVendors, useDeleteVendor } from '@/hooks/useVendors'
import { VendorForm } from '@/components/features/vendors/VendorForm'
import { Button } from '@/components/ui/button'
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import type { Vendor } from '@/types/api'

function VendorAvatar({ name, logoUrl }: { name: string; logoUrl?: string }) {
  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt={name}
        className="h-8 w-8 rounded-full object-cover border border-border"
        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
      />
    )
  }
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
      {initials}
    </div>
  )
}

const INDUSTRY_LABELS: Record<string, string> = {
  teknologi: 'Teknologi',
  keuangan: 'Keuangan',
  manufaktur: 'Manufaktur',
  kesehatan: 'Kesehatan',
  retail: 'Retail',
  properti: 'Properti',
  pendidikan: 'Pendidikan',
  energi: 'Energi',
  telekomunikasi: 'Telekomunikasi',
}

export default function VendorsPage() {
  const { data, isLoading } = useVendors()
  const { mutate: deleteVendor, isPending: isDeleting } = useDeleteVendor()

  const [formOpen, setFormOpen] = useState(false)
  const [editVendor, setEditVendor] = useState<Vendor | undefined>(undefined)
  const [deleteTarget, setDeleteTarget] = useState<Vendor | null>(null)

  const vendors = data?.data ?? []

  const handleEdit = (vendor: Vendor) => {
    setEditVendor(vendor)
    setFormOpen(true)
  }

  const handleFormOpenChange = (open: boolean) => {
    setFormOpen(open)
    if (!open) setEditVendor(undefined)
  }

  const handleDelete = () => {
    if (!deleteTarget) return
    deleteVendor(deleteTarget.id, {
      onSuccess: () => {
        toast.success(`Vendor "${deleteTarget.name}" berhasil dihapus`)
        setDeleteTarget(null)
      },
      onError: (err) => {
        toast.error((err as Error).message)
        setDeleteTarget(null)
      },
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Vendor</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Kelola daftar vendor dan sponsor event
          </p>
        </div>
        <Button onClick={() => { setEditVendor(undefined); setFormOpen(true) }}>
          Tambah Vendor
        </Button>
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10" />
              <TableHead>Nama</TableHead>
              <TableHead>Industri</TableHead>
              <TableHead>Email Kontak</TableHead>
              <TableHead className="text-center">Event</TableHead>
              <TableHead className="w-32" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  Memuat...
                </TableCell>
              </TableRow>
            )}
            {!isLoading && vendors.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  Belum ada vendor. Klik "Tambah Vendor" untuk memulai.
                </TableCell>
              </TableRow>
            )}
            {vendors.map((vendor) => (
              <TableRow key={vendor.id}>
                <TableCell>
                  <VendorAvatar name={vendor.name} logoUrl={vendor.logo_url} />
                </TableCell>
                <TableCell>
                  <div className="font-medium">{vendor.name}</div>
                  {vendor.website && (
                    <a
                      href={vendor.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-muted-foreground hover:text-primary truncate block max-w-[200px]"
                    >
                      {vendor.website.replace(/^https?:\/\//, '')}
                    </a>
                  )}
                </TableCell>
                <TableCell>
                  {vendor.industry ? (
                    <Badge variant="outline" className="text-xs font-normal">
                      {INDUSTRY_LABELS[vendor.industry] ?? vendor.industry}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground text-sm">—</span>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {vendor.contact_email}
                </TableCell>
                <TableCell className="text-center">
                  <span className="text-sm font-medium">{vendor.linked_event_count}</span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs"
                      onClick={() => handleEdit(vendor)}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(vendor)}
                    >
                      Hapus
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <VendorForm
        open={formOpen}
        onOpenChange={handleFormOpenChange}
        vendor={editVendor}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Vendor?</AlertDialogTitle>
            <AlertDialogDescription>
              Vendor <strong>{deleteTarget?.name}</strong> akan dihapus dari daftar.
              {deleteTarget && deleteTarget.linked_event_count > 0 && (
                <span className="block mt-2 text-destructive">
                  Vendor ini terhubung ke {deleteTarget.linked_event_count} event dan tidak dapat dihapus.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Menghapus...' : 'Ya, Hapus'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
