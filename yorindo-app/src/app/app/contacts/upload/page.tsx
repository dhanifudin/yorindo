'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import Link from 'next/link'

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── API helpers ──────────────────────────────────────────────────────────────

async function uploadFile(file: File): Promise<{ jobId: string }> {
  const form = new FormData()
  form.append('file', file)
  form.append('uploadSource', 'etl_import')

  const res = await fetch('/api/etl/upload', { method: 'POST', body: form })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.error?.message ?? `Upload gagal (${res.status})`)
  }
  return res.json()
}

async function fetchJobStatus(jobId: string): Promise<EtlJob> {
  const res = await fetch(`/api/etl/jobs/${encodeURIComponent(jobId)}`)
  if (!res.ok) throw new Error(`Gagal mengambil status job (${res.status})`)
  return res.json()
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatSize(bytes: number) {
  return bytes < 1024 * 1024
    ? `${(bytes / 1024).toFixed(1)} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const STATUS_BADGE: Record<EtlJob['status'], string> = {
  queued:     'bg-muted text-muted-foreground',
  processing: 'bg-blue-100 text-blue-700',
  completed:  'bg-green-100 text-green-700',
  failed:     'bg-destructive/10 text-destructive',
}
const STATUS_LABEL: Record<EtlJob['status'], string> = {
  queued:     'Dalam Antrian',
  processing: 'Diproses',
  completed:  'Selesai',
  failed:     'Gagal',
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function UploadPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileError, setFileError]       = useState<string | null>(null)
  const [uploading, setUploading]       = useState(false)
  const [isDragOver, setIsDragOver]     = useState(false)

  const [activeJobId, setActiveJobId]   = useState<string | null>(null)
  const [job, setJob]                   = useState<EtlJob | null>(null)

  const inputRef = useRef<HTMLInputElement>(null)
  const pollRef  = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Job polling ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!activeJobId) return

    const tick = async () => {
      try {
        const status = await fetchJobStatus(activeJobId)
        setJob(status)
        if (status.status === 'completed' || status.status === 'failed') {
          clearInterval(pollRef.current!)
          pollRef.current = null
        }
      } catch {
        // keep polling silently on transient errors
      }
    }

    tick()
    pollRef.current = setInterval(tick, 1500)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [activeJobId])

  // ── File validation ──────────────────────────────────────────────────────────

  const validateFile = useCallback((f: File): string | null => {
    const ext = f.name.split('.').pop()?.toLowerCase() ?? ''
    if (!['xlsx', 'csv'].includes(ext))
      return `Format ".${ext || '?'}" tidak didukung. Gunakan .xlsx atau .csv.`
    if (f.size > 10 * 1024 * 1024)
      return 'File melebihi batas ukuran 10MB.'
    return null
  }, [])

  const applyFile = useCallback((f: File) => {
    const err = validateFile(f)
    if (err) {
      setFileError(err)
      setSelectedFile(null)
      toast.error('File tidak dapat diunggah', { description: err, duration: 4000 })
      return
    }
    setFileError(null)
    setSelectedFile(f)
  }, [validateFile])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (f) applyFile(f)
  }
  const handleClearFile = () => {
    setSelectedFile(null); setFileError(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  // ── Drag & drop ──────────────────────────────────────────────────────────────

  const handleDragOver  = (e: React.DragEvent) => { e.preventDefault(); setIsDragOver(true) }
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragOver(false) }
  const handleDrop      = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragOver(false)
    const f = e.dataTransfer.files?.[0]; if (f) applyFile(f)
  }

  // ── Upload ───────────────────────────────────────────────────────────────────

  const handleUpload = async () => {
    if (!selectedFile || uploading) return
    setUploading(true)
    setFileError(null)
    setJob(null)
    setActiveJobId(null)
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }

    try {
      const { jobId } = await uploadFile(selectedFile)
      setActiveJobId(jobId)
      setJob({ jobId, status: 'queued', progress: 0 })
      toast.success(`File diunggah. Job ID: ${jobId}`)
      setSelectedFile(null)
      if (inputRef.current) inputRef.current.value = ''
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload gagal'
      setFileError(msg)
      toast.error('Upload gagal', { description: msg })
    } finally {
      setUploading(false)
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-5 pb-10 max-w-[520px]">
      {/* Header */}
      <div>
        <Link href="/app/contacts" className="text-muted-foreground hover:text-foreground text-sm inline-flex items-center gap-1">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          Kembali ke Kontak
        </Link>
        <h1 className="text-2xl font-bold mt-2">Upload Data Kontak</h1>
      </div>

      {/* Upload card */}
      <Card>
        <CardHeader className="pb-3">
          <h2 className="text-base font-semibold">Pilih File</h2>
          <p className="text-sm text-muted-foreground">Format yang diterima: .xlsx, .csv — maks 10MB</p>
        </CardHeader>
        <CardContent className="space-y-4">

          {/* Drag-and-drop zone */}
          {!selectedFile && (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              className={[
                'relative flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 py-10 cursor-pointer select-none transition-all duration-200',
                isDragOver
                  ? 'border-primary bg-primary/5 scale-[1.01]'
                  : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30',
              ].join(' ')}
            >
              <input ref={inputRef} type="file" accept=".xlsx,.csv" onChange={handleFileChange} className="sr-only" />

              <div className={`transition-transform duration-200 ${isDragOver ? 'scale-110 -translate-y-1' : ''}`}>
                <svg width="44" height="44" viewBox="0 0 44 44" fill="none" className={isDragOver ? 'text-primary' : 'text-muted-foreground/40'}>
                  <path d="M30 28H14a8 8 0 01-1-15.94A9 9 0 0131.93 15H32a7 7 0 010 14z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M22 36V24M17 29l5-5 5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>

              <div className="text-center space-y-0.5">
                <p className="text-sm font-medium">{isDragOver ? 'Lepaskan file di sini' : 'Seret & lepas file, atau klik untuk pilih'}</p>
                <p className="text-xs text-muted-foreground">.xlsx atau .csv · maks 10MB</p>
              </div>

              <div className="flex gap-2">
                {['xlsx', 'csv'].map((ext) => (
                  <span key={ext} className="text-[11px] font-mono font-medium uppercase px-2 py-0.5 rounded bg-muted text-muted-foreground border">.{ext}</span>
                ))}
              </div>
            </div>
          )}

          {/* Selected file chip */}
          {selectedFile && (
            <div className="flex items-center gap-3 rounded-md border bg-muted/40 px-3 py-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10">
                <span className="text-[10px] font-bold uppercase text-primary">{selectedFile.name.split('.').pop()}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground">{formatSize(selectedFile.size)}</p>
              </div>
              <button
                type="button" onClick={handleClearFile}
                className="shrink-0 rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                aria-label="Batalkan pilihan"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          )}

          {fileError && <p className="text-sm text-destructive">{fileError}</p>}

          {uploading && (
            <div className="flex items-center gap-3 rounded-md border border-blue-200 bg-blue-50 px-3 py-2.5">
              <svg className="h-4 w-4 animate-spin text-blue-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
              </svg>
              <p className="text-sm text-blue-700">Mengunggah file ke server…</p>
            </div>
          )}

          <Button onClick={handleUpload} disabled={!selectedFile || uploading} className="w-full">
            {uploading ? 'Mengunggah…' : 'Upload & Proses ETL'}
          </Button>
        </CardContent>
      </Card>

      {/* ETL job status */}
      {job && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">Status Job ETL</h2>
              <Badge className={STATUS_BADGE[job.status]}>{STATUS_LABEL[job.status]}</Badge>
            </div>
            <p className="text-xs text-muted-foreground font-mono break-all">{job.jobId}</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {(job.status === 'queued' || job.status === 'processing') && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Progress</span><span>{job.progress ?? 0}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary transition-all duration-500" style={{ width: `${job.progress ?? 0}%` }}/>
                </div>
                {(job.rowsProcessed !== undefined && job.totalRows !== undefined) && (
                  <p className="text-xs text-muted-foreground">{job.rowsProcessed} / {job.totalRows} baris diproses</p>
                )}
              </div>
            )}
            {job.status === 'completed' && (
              <div className="space-y-1 text-sm">
                {job.totalRows !== undefined && <p>Total baris: <strong>{job.totalRows}</strong></p>}
                {job.rowsProcessed !== undefined && <p>Diproses: <strong>{job.rowsProcessed}</strong></p>}
                <p>Ditandai (perlu review): <strong>{job.flaggedRows ?? 0}</strong></p>
                {(job.flaggedRows ?? 0) > 0 && (
                  <Link href="/app/contacts/flagged" className="text-primary underline text-sm block mt-1">
                    Review record yang ditandai →
                  </Link>
                )}
                <Link href="/app/contacts" className="text-primary underline text-sm block">
                  Lihat database kontak →
                </Link>
              </div>
            )}
            {job.status === 'failed' && (
              <p className="text-sm text-destructive">{job.error ?? 'Job gagal — periksa log server'}</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
