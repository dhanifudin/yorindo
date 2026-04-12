'use client'

import { StandardValuesManager } from '@/components/settings/StandardValuesManager'

export default function StandardsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Standar Data</h1>
        <p className="text-muted-foreground">Kelola industri dan jabatan baku untuk normalisasi kontak</p>
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
    </div>
  )
}
