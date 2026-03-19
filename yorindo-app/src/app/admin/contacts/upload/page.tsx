'use client'

import { useState, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import Link from 'next/link'

interface EtlJob {
  jobId: string
  status: 'queued' | 'processing' | 'completed' | 'failed'
  progress?: number
  rowsProcessed?: number
  totalRows?: number
  flaggedRows?: number
  completedAt?: string
  error?: string
}

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [jobId, setJobId] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const { data: job } = useQuery<EtlJob>({
    queryKey: ['etl-job', jobId],
    queryFn: () => fetch(`/api/etl/jobs/${jobId}`).then((r) => r.json()),
    enabled: !!jobId,
    refetchInterval: (query) => {
      const status = (query.state.data as EtlJob | undefined)?.status
      return status === 'queued' || status === 'processing' ? 2000 : false
    },
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    const ext = f.name.split('.').pop()?.toLowerCase()
    if (!['xlsx', 'csv'].includes(ext ?? '')) {
      setError('Hanya file .xlsx dan .csv yang diterima')
      setFile(null)
      return
    }
    if (f.size > 10 * 1024 * 1024) {
      setError('File melebihi batas 10MB')
      setFile(null)
      return
    }
    setError(null)
    setFile(f)
  }

  const handleUpload = async () => {
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/etl/upload', { method: 'POST', body: formData })
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body?.error?.message ?? 'Upload gagal')
      }
      const data = await res.json()
      setJobId(data.jobId)
      toast.success(`File diunggah. Job ID: ${data.jobId}`)
      setFile(null)
      if (inputRef.current) inputRef.current.value = ''
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload gagal')
      toast.error('Upload gagal')
    } finally {
      setUploading(false)
    }
  }

  const STATUS_BADGE: Record<EtlJob['status'], string> = {
    queued: 'bg-muted text-muted-foreground',
    processing: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
    failed: 'bg-destructive/10 text-destructive',
  }

  const STATUS_LABEL: Record<EtlJob['status'], string> = {
    queued: 'Dalam Antrian',
    processing: 'Diproses',
    completed: 'Selesai',
    failed: 'Gagal',
  }

  return (
    <div className="max-w-xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/contacts" className="text-muted-foreground hover:text-foreground text-sm">
          ← Kembali ke Kontak
        </Link>
      </div>
      <h1 className="text-2xl font-bold mb-6">Upload Data Kontak</h1>

      <Card className="mb-6">
        <CardHeader>
          <h2 className="text-base font-semibold">Pilih File</h2>
          <p className="text-sm text-muted-foreground">Format yang diterima: .xlsx, .csv — maks 10MB</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.csv"
            onChange={handleFileChange}
            className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
          />
          {file && (
            <p className="text-sm text-muted-foreground">
              Dipilih: <strong>{file.name}</strong> ({(file.size / 1024).toFixed(1)} KB)
            </p>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button onClick={handleUpload} disabled={!file || uploading}>
            {uploading ? 'Mengunggah…' : 'Upload & Proses ETL'}
          </Button>
        </CardContent>
      </Card>

      {job && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">Status Job ETL</h2>
              <Badge className={STATUS_BADGE[job.status]}>{STATUS_LABEL[job.status]}</Badge>
            </div>
            <p className="text-xs text-muted-foreground font-mono">{job.jobId}</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {(job.status === 'queued' || job.status === 'processing') && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Progress</span>
                  <span>{job.progress ?? 0}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-500"
                    style={{ width: `${job.progress ?? 0}%` }}
                  />
                </div>
                {job.rowsProcessed != null && (
                  <p className="text-xs text-muted-foreground">
                    {job.rowsProcessed} / {job.totalRows} baris diproses
                  </p>
                )}
              </div>
            )}
            {job.status === 'completed' && (
              <div className="space-y-1 text-sm">
                <p>Total baris: <strong>{job.totalRows}</strong></p>
                <p>Diproses: <strong>{job.rowsProcessed}</strong></p>
                <p>Ditandai (perlu review): <strong>{job.flaggedRows ?? 0}</strong></p>
                {(job.flaggedRows ?? 0) > 0 && (
                  <Link href="/admin/contacts/flagged" className="text-primary underline text-sm">
                    Review record yang ditandai →
                  </Link>
                )}
              </div>
            )}
            {job.status === 'failed' && (
              <p className="text-sm text-destructive">{job.error ?? 'Job gagal'}</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
