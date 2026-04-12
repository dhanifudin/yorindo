'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { StandardValuesManager } from '@/components/settings/StandardValuesManager'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Search, RefreshCw, Loader2, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'

interface CityItem {
  province_code: string
  province_name: string
  city_code: string
  city_name: string
  aliases: string[]
}

interface SyncResult {
  success: boolean
  inserted: number
  updated: number
  total: number
}

async function fetchCities(): Promise<CityItem[]> {
  const res = await fetch('/api/cities')
  if (!res.ok) throw new Error('Failed to fetch cities')
  const data = await res.json()
  return data.data ?? []
}

async function syncCities(): Promise<SyncResult> {
  const res = await fetch('/api/cities/sync', { method: 'POST' })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message ?? 'Gagal sinkronisasi')
  }
  return res.json()
}

export default function DataPage() {
  const queryClient = useQueryClient()
  const [searchCity, setSearchCity] = useState('')

  const { data: cities, isLoading } = useQuery<CityItem[]>({
    queryKey: ['cities'],
    queryFn: fetchCities,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  const syncMutation = useMutation({
    mutationFn: syncCities,
    onSuccess: (result) => {
      toast.success(`Sinkronisasi berhasil: ${result.inserted} ditambahkan, ${result.updated} diperbarui`)
      queryClient.invalidateQueries({ queryKey: ['cities'] })
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Gagal sinkronisasi data wilayah')
    },
  })

  const groupedByProvince = (() => {
    const groups: Record<string, CityItem[]> = {}
    for (const item of cities ?? []) {
      if (!groups[item.province_name]) groups[item.province_name] = []
      groups[item.province_name].push(item)
    }
    return groups
  })()

  const filteredProvinces = (() => {
    if (!searchCity.trim()) return Object.entries(groupedByProvince)

    const q = searchCity.toLowerCase()
    const result: [string, CityItem[]][] = []

    for (const [province, cityList] of Object.entries(groupedByProvince)) {
      const filtered = cityList.filter(c =>
        c.city_name.toLowerCase().includes(q) ||
        c.province_name.toLowerCase().includes(q)
      )
      if (filtered.length > 0) {
        result.push([province, filtered])
      }
    }
    return result
  })()

  const totalCities = cities?.length ?? 0
  const totalProvinces = new Set(cities?.map(c => c.province_name) ?? []).size

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Kelola Data</h1>
        <p className="text-muted-foreground">Industri, jabatan, dan daftar wilayah untuk normalisasi kontak</p>
      </div>

      <StandardValuesManager
        endpoint="/industries"
        title="Industri Standar"
        description="Kelola daftar industri baku untuk normalisasi kontak"
        label="Industri"
      />

      <StandardValuesManager
        endpoint="/job-titles"
        title="Jabatan Standar"
        description="Kelola daftar jabatan baku untuk normalisasi kontak"
        label="Jabatan"
      />

      {/* Wilayah / Location data */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Daftar Wilayah Indonesia</CardTitle>
              <CardDescription>
                {totalCities > 0
                  ? `${totalCities} kota/kabupaten dari ${totalProvinces} provinsi — disinkronisasi dari wilayah.id`
                  : 'Belum ada data wilayah. Klik "Sinkronisasi" untuk mengambil data terbaru.'}
              </CardDescription>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending}
            >
              {syncMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : syncMutation.isSuccess ? (
                <CheckCircle2 className="w-4 h-4 mr-1 text-green-600" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-1" />
              )}
              {syncMutation.isPending ? 'Sinkronisasi...' : 'Sinkronisasi'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Cari kota atau provinsi..."
              value={searchCity}
              onChange={(e) => setSearchCity(e.target.value)}
              className="pl-9"
            />
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : filteredProvinces.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {cities && cities.length > 0
                ? `Tidak ada wilayah yang ditemukan untuk pencarian "${searchCity}"`
                : 'Belum ada data wilayah. Klik "Sinkronisasi" untuk mengambil data dari wilayah.id'}
            </p>
          ) : (
            <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2">
              {filteredProvinces.map(([province, cityList]) => (
                <div key={province} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold">{province}</h3>
                    <Badge variant="secondary" className="text-xs">{cityList.length} kota/kab</Badge>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[120px]">Kode</TableHead>
                        <TableHead>Nama Kota/Kabupaten</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cityList.map((city) => (
                        <TableRow key={city.city_code}>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {city.city_code}
                          </TableCell>
                          <TableCell className="font-medium">{city.city_name}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
