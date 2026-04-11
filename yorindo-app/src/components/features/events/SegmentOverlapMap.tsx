'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { CompletionStats } from '@/types/api'

interface SegmentOverlapMapProps {
  rows: CompletionStats['segmentOverlap']
}

function rateBadgeVariant(rate: number): 'default' | 'secondary' | 'destructive' {
  if (rate >= 75) return 'default'
  if (rate >= 50) return 'secondary'
  return 'destructive'
}

function rateBadgeClass(rate: number): string {
  if (rate >= 75) return 'bg-green-100 text-green-800 hover:bg-green-100'
  if (rate >= 50) return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100'
  return ''
}

export function SegmentOverlapMap({ rows }: SegmentOverlapMapProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Segment Overlap</CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Kombinasi industri × kota dengan kehadiran tertinggi. Menunjukkan segmen peserta mana yang paling responsif terhadap event ini — berguna untuk menentukan target audiens di event berikutnya.
        </p>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Tidak ada data segmen untuk event ini
          </p>
        ) : (
          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Industri</TableHead>
                  <TableHead>Kota</TableHead>
                  <TableHead className="text-right">Hadir</TableHead>
                  <TableHead className="text-right">Disetujui</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-sm max-w-[180px] truncate" title={row.industry}>
                      {row.industry ?? '—'}
                    </TableCell>
                    <TableCell className="text-sm">{row.city ?? '—'}</TableCell>
                    <TableCell className="text-right text-sm font-medium">{row.attended}</TableCell>
                    <TableCell className="text-right text-sm">{row.approved}</TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant={rateBadgeVariant(row.rate)}
                        className={rateBadgeClass(row.rate)}
                      >
                        {row.rate}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
