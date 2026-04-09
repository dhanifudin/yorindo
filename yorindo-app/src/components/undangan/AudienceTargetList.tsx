'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { Users } from 'lucide-react'
import type { AudiencePreviewContact } from '@/types/api'

interface AudienceTargetListProps {
  contacts: AudiencePreviewContact[]
  totalContacts: number
  isLoading: boolean
  selectedIds: Set<string>
  onSelectionChange: (selected: Set<string>) => void
}

const PAGE_SIZE = 20

export function AudienceTargetList({
  contacts,
  totalContacts,
  isLoading,
  selectedIds,
  onSelectionChange,
}: AudienceTargetListProps) {
  const [page, setPage] = useState(0)

  const totalPages = Math.ceil(totalContacts / PAGE_SIZE)
  const paginatedContacts = contacts.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const allSelected = paginatedContacts.length > 0 && paginatedContacts.every(c => selectedIds.has(c.id))

  function toggleAll() {
    if (allSelected) {
      const next = new Set(selectedIds)
      paginatedContacts.forEach(c => next.delete(c.id))
      onSelectionChange(next)
    } else {
      const next = new Set(selectedIds)
      paginatedContacts.forEach(c => next.add(c.id))
      onSelectionChange(next)
    }
  }

  function toggleOne(id: string) {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    onSelectionChange(next)
  }

  const hasMore = page < totalPages - 1
  const hasPrev = page > 0

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Audiens Target</CardTitle>
            <CardDescription>
              {isLoading ? (
                <Skeleton className="h-4 w-48 mt-1" />
              ) : (
                `${totalContacts.toLocaleString('id-ID')} kontak cocok dengan kriteria event ini`
              )}
            </CardDescription>
          </div>
          {!isLoading && totalContacts > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {selectedIds.size} dipilih
              </span>
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-7"
                onClick={() => {
                  if (selectedIds.size === totalContacts) {
                    onSelectionChange(new Set())
                  } else {
                    onSelectionChange(new Set(contacts.map(c => c.id)))
                  }
                }}
              >
                {selectedIds.size === totalContacts ? 'Hapus Semua' : 'Pilih Semua'}
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : contacts.length === 0 ? (
          <div className="py-8 text-center">
            <Users className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-sm font-medium text-muted-foreground mb-1">
              Tidak ada kontak yang cocok dengan kriteria ini
            </p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Event ini belum memiliki kriteria targeting yang sesuai. Silakan update event terlebih dahulu.
            </p>
          </div>
        ) : (
          <>
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={toggleAll}
                        aria-label="Pilih semua di halaman ini"
                      />
                    </TableHead>
                    <TableHead>Nama</TableHead>
                    <TableHead className="hidden md:table-cell">Email</TableHead>
                    <TableHead className="hidden lg:table-cell">Telepon</TableHead>
                    <TableHead className="hidden lg:table-cell">Kota</TableHead>
                    <TableHead className="hidden md:table-cell">Perusahaan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedContacts.map((contact) => (
                    <TableRow key={contact.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(contact.id)}
                          onCheckedChange={() => toggleOne(contact.id)}
                          aria-label={`Pilih ${contact.name}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{contact.name}</TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                        {contact.email ?? '—'}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground text-sm">
                        {contact.phone ?? '—'}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {contact.city ? (
                          <Badge variant="secondary" className="text-xs">{contact.city}</Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm">
                        {contact.company ?? '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-xs text-muted-foreground">
                  Halaman {page + 1} dari {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!hasPrev}
                    onClick={() => setPage(p => p - 1)}
                  >
                    Sebelumnya
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!hasMore}
                    onClick={() => setPage(p => p + 1)}
                  >
                    Selanjutnya
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
