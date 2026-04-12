'use client'

import { useState, useMemo } from 'react'
import { StandardValuesManager } from '@/components/settings/StandardValuesManager'
import wilayahData from '@/data/wilayah-static.json'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
import { Search } from 'lucide-react'

interface WilayahItem {
  provinceCode: string
  provinceName: string
  cityCode: string
  cityName: string
  aliases: string[]
}

const wilayah = wilayahData as WilayahItem[]

export default function DataPage() {
  const [searchCity, setSearchCity] = useState('')

  const groupedByProvince = useMemo(() => {
    const groups: Record<string, WilayahItem[]> = {}
    for (const item of wilayah) {
      if (!groups[item.provinceName]) groups[item.provinceName] = []
      groups[item.provinceName].push(item)
    }
    return groups
  }, [])

  const filteredProvinces = useMemo(() => {
    if (!searchCity.trim()) return Object.entries(groupedByProvince)

    const q = searchCity.toLowerCase()
    const result: [string, WilayahItem[]][] = []

    for (const [province, cities] of Object.entries(groupedByProvince)) {
      const filtered = cities.filter(c =>
        c.cityName.toLowerCase().includes(q) ||
        c.provinceName.toLowerCase().includes(q) ||
        c.aliases.some(a => a.toLowerCase().includes(q))
      )
      if (filtered.length > 0) {
        result.push([province, filtered])
      }
    }
    return result
  }, [groupedByProvince, searchCity])

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
                {wilayah.length} kota/kabupaten dari 34 provinsi — digunakan untuk filter kontak dan registrasi
              </CardDescription>
            </div>
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

          {filteredProvinces.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Tidak ada wilayah yang ditemukan untuk pencarian "{searchCity}"
            </p>
          ) : (
            <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2">
              {filteredProvinces.map(([province, cities]) => (
                <div key={province} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold">{province}</h3>
                    <Badge variant="secondary" className="text-xs">{cities.length} kota/kab</Badge>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[120px]">Kode</TableHead>
                        <TableHead>Nama Kota/Kabupaten</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cities.map((city) => (
                        <TableRow key={city.cityCode}>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {city.cityCode}
                          </TableCell>
                          <TableCell className="font-medium">{city.cityName}</TableCell>
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
