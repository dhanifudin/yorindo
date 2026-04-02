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

interface UploadedFile {
  id: string
  name: string
  size: number
  uploadedAt: string
  jobId: string
}

interface PreviewRow {
  nama: string
  email: string
  telepon: string
  kota: string
  status: 'valid' | 'flagged'
  flagReason?: string
}

// ─── Mock preview data ────────────────────────────────────────────────────────

const MOCK_PREVIEW_ROWS: PreviewRow[] = [
  { nama: 'Budi Santoso',    email: 'budi.santoso@gmail.com',    telepon: '08123456789', kota: 'Jakarta',    status: 'valid' },
  { nama: 'Siti Rahayu',     email: 'siti.r@yahoo.com',          telepon: '08234567890', kota: 'Bandung',    status: 'valid' },
  { nama: 'Ahmad Fauzi',     email: 'ahmad.fauzi@company.co.id', telepon: '08345678901', kota: 'Surabaya',   status: 'valid' },
  { nama: 'Dewi Anggraini',  email: 'dewi_a@hotmail.com',        telepon: '',            kota: 'Yogyakarta', status: 'flagged', flagReason: 'Telepon kosong' },
  { nama: 'Rizky Pratama',   email: 'rizky.p@gmail.com',         telepon: '08567890123', kota: 'Medan',      status: 'valid' },
  { nama: 'Rina Wulandari',  email: 'rina.wulan',                telepon: '08678901234', kota: 'Semarang',   status: 'flagged', flagReason: 'Email tidak valid' },
  { nama: 'Hendra Gunawan',  email: 'hendra.g@gmail.com',        telepon: '08789012345', kota: 'Makassar',   status: 'valid' },
  { nama: 'Fitri Handayani', email: 'fitri.h@gmail.com',         telepon: '08890123456', kota: 'Palembang',  status: 'valid' },
]

// ─── Module-level mock store ──────────────────────────────────────────────────

const mockJobStore: Record<string, EtlJob> = {}
const mockFileStore: UploadedFile[] = []

function createMockJob(jobId: string): EtlJob {
  const job: EtlJob = { jobId, status: 'queued', progress: 0, rowsProcessed: 0, totalRows: 0 }
  mockJobStore[jobId] = job
  return job
}

function simulateJob(jobId: string, onTick: () => void) {
  const totalRows = Math.floor(Math.random() * 900) + 100
  mockJobStore[jobId] = { ...mockJobStore[jobId], status: 'processing', totalRows, progress: 0, rowsProcessed: 0 }
  onTick()

  let processed = 0
  const interval = setInterval(() => {
    processed += Math.floor(Math.random() * 60) + 20
    if (processed >= totalRows) {
      processed = totalRows
      mockJobStore[jobId] = {
        ...mockJobStore[jobId],
        status: 'completed',
        progress: 100,
        rowsProcessed: totalRows,
        totalRows,
        flaggedRows: Math.floor(Math.random() * 10),
        completedAt: new Date().toISOString(),
      }
      clearInterval(interval)
    } else {
      mockJobStore[jobId] = {
        ...mockJobStore[jobId],
        progress: Math.round((processed / totalRows) * 100),
        rowsProcessed: processed,
      }
    }
    onTick()
  }, 800)
}

async function mockUploadFile(file: File): Promise<{ jobId: string; fileId: string }> {
  await new Promise((r) => setTimeout(r, 1200))
  const jobId = `job-${Math.random().toString(36).slice(2, 10)}`
  const fileId = `file-${Math.random().toString(36).slice(2, 10)}`
  createMockJob(jobId)
  mockFileStore.unshift({ id: fileId, name: file.name, size: file.size, uploadedAt: new Date().toISOString(), jobId })
  return { jobId, fileId }
}

async function mockDeleteFile(fileId: string): Promise<void> {
  await new Promise((r) => setTimeout(r, 400))
  const idx = mockFileStore.findIndex((f) => f.id === fileId)
  if (idx !== -1) mockFileStore.splice(idx, 1)
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
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
  const [selectedFile, setSelectedFile]   = useState<File | null>(null)
  const [fileError, setFileError]         = useState<string | null>(null)
  const [uploading, setUploading]         = useState(false)
  const [isDragOver, setIsDragOver]       = useState(false)

  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [deletingIds, setDeletingIds]     = useState<Set<string>>(new Set())

  const [activeJobId, setActiveJobId]     = useState<string | null>(null)
  const [jobSnapshot, setJobSnapshot]     = useState<EtlJob | null>(null)

  // Preview is only shown after ETL completes, and user can dismiss it
  const [previewVisible, setPreviewVisible] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const pollRef  = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Job polling ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!activeJobId) return
    setJobSnapshot({ ...mockJobStore[activeJobId] })

    pollRef.current = setInterval(() => {
      const job = mockJobStore[activeJobId]
      if (!job) return
      setJobSnapshot({ ...job })
      if (job.status === 'completed' || job.status === 'failed') {
        clearInterval(pollRef.current!)
        pollRef.current = null
        setUploadedFiles([...mockFileStore])
        // ✅ Only reveal preview once ETL is done
        if (job.status === 'completed') setPreviewVisible(true)
      }
    }, 600)

    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [activeJobId])

  // ── File validation ─────────────────────────────────────────────────────────

  const validateFile = useCallback((f: File): string | null => {
    const ext = f.name.split('.').pop()?.toLowerCase() ?? ''
    if (!['xlsx', 'csv'].includes(ext)) return `Format ".${ext || '?'}" tidak didukung. Gunakan .xlsx atau .csv.`
    if (f.size > 10 * 1024 * 1024) return 'File melebihi batas ukuran 10MB.'
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

  // ── Drag & drop ─────────────────────────────────────────────────────────────

  const handleDragOver  = (e: React.DragEvent) => { e.preventDefault(); setIsDragOver(true) }
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragOver(false) }
  const handleDrop      = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragOver(false)
    const f = e.dataTransfer.files?.[0]; if (f) applyFile(f)
  }

  // ── Upload ──────────────────────────────────────────────────────────────────

  const handleUpload = async () => {
    if (!selectedFile || uploading) return
    setUploading(true); setFileError(null)
    try {
      const { jobId } = await mockUploadFile(selectedFile)
      setUploadedFiles([...mockFileStore])
      setActiveJobId(jobId)
      setJobSnapshot(mockJobStore[jobId])
      setPreviewVisible(false) // hide any old preview while new job runs
      setTimeout(() => simulateJob(jobId, () => {
        setJobSnapshot({ ...mockJobStore[jobId] })
        setUploadedFiles([...mockFileStore])
      }), 200)
      toast.success(`File diunggah. Job ID: ${jobId}`)
      setSelectedFile(null)
      if (inputRef.current) inputRef.current.value = ''
    } catch (err) {
      setFileError(err instanceof Error ? err.message : 'Upload gagal')
      toast.error('Upload gagal')
    } finally {
      setUploading(false)
    }
  }

  // ── Delete uploaded file ────────────────────────────────────────────────────

  const handleDelete = async (fileEntry: UploadedFile) => {
    setDeletingIds((prev) => new Set(prev).add(fileEntry.id))
    try {
      await mockDeleteFile(fileEntry.id)
      setUploadedFiles([...mockFileStore])
      if (fileEntry.jobId === activeJobId) {
        setActiveJobId(null); setJobSnapshot(null); setPreviewVisible(false)
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
      }
      toast.success(`File "${fileEntry.name}" berhasil dihapus`)
    } catch {
      toast.error('Gagal menghapus file')
    } finally {
      setDeletingIds((prev) => { const n = new Set(prev); n.delete(fileEntry.id); return n })
    }
  }

  // ── Dismiss preview ─────────────────────────────────────────────────────────
  const handleDismissPreview = () => setPreviewVisible(false)

  const job          = jobSnapshot
  const flaggedCount = MOCK_PREVIEW_ROWS.filter((r) => r.status === 'flagged').length

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-5 pb-10">
      {/* Header */}
      <div>
        <Link href="/app/contacts" className="text-muted-foreground hover:text-foreground text-sm inline-flex items-center gap-1">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          Kembali ke Kontak
        </Link>
        <h1 className="text-2xl font-bold mt-2">Upload Data Kontak</h1>
      </div>

      {/*
        Layout:
        - Mobile  → single column, stacked
        - Desktop → 2 columns side-by-side (left fixed ~400px, right flex-1)
          but only when preview is visible, otherwise left col is centered / narrower
      */}
      <div className={`flex flex-col ${previewVisible ? 'lg:flex-row' : ''} gap-5 items-start`}>

        {/* ══ LEFT / MAIN COLUMN ════════════════════════════════════════════════ */}
        <div className={`flex flex-col gap-4 w-full ${previewVisible ? 'lg:w-[400px] lg:shrink-0' : 'max-w-[520px]'}`}>

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

              {/* Upload loading */}
              {uploading && (
                <div className="flex items-center gap-3 rounded-md border border-blue-200 bg-blue-50 px-3 py-2.5">
                  <svg className="h-4 w-4 animate-spin text-blue-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                  </svg>
                  <p className="text-sm text-blue-700">Mengunggah dan memproses file…</p>
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
                    <p className="text-xs text-muted-foreground">{job.rowsProcessed} / {job.totalRows} baris diproses</p>
                  </div>
                )}
                {job.status === 'completed' && (
                  <div className="space-y-1 text-sm">
                    <p>Total baris: <strong>{job.totalRows}</strong></p>
                    <p>Diproses: <strong>{job.rowsProcessed}</strong></p>
                    <p>Ditandai (perlu review): <strong>{job.flaggedRows ?? 0}</strong></p>
                    {(job.flaggedRows ?? 0) > 0 && (
                      <Link href="/app/contacts/flagged" className="text-primary underline text-sm block mt-1">
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

          {/* Uploaded files list */}
          {uploadedFiles.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <h2 className="text-base font-semibold">File yang Diunggah</h2>
                <p className="text-sm text-muted-foreground">{uploadedFiles.length} file</p>
              </CardHeader>
              <CardContent className="p-0">
                {uploadedFiles.map((f, idx) => {
                  const isDeleting = deletingIds.has(f.id)
                  const fileJob    = mockJobStore[f.jobId]
                  const isActive   = f.jobId === activeJobId
                  return (
                    <div
                      key={f.id}
                      className={[
                        'flex items-center gap-3 px-4 py-3 transition-colors',
                        idx !== uploadedFiles.length - 1 ? 'border-b' : '',
                        isDeleting ? 'opacity-50 pointer-events-none' : '',
                        isActive ? 'bg-muted/40' : '',
                      ].join(' ')}
                    >
                      <div className="shrink-0 w-8 h-8 rounded-md bg-muted flex items-center justify-center">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">{f.name.split('.').pop()}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{f.name}</p>
                        <p className="text-xs text-muted-foreground">{formatSize(f.size)} · {formatDate(f.uploadedAt)}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {fileJob && (
                          <Badge className={`${STATUS_BADGE[fileJob.status]} text-[11px] px-2 py-0.5 hidden sm:inline-flex`}>
                            {STATUS_LABEL[fileJob.status]}
                          </Badge>
                        )}
                        <Button
                          variant="ghost" size="sm"
                          onClick={() => handleDelete(f)}
                          disabled={isDeleting}
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          aria-label={`Hapus ${f.name}`}
                        >
                          {isDeleting ? (
                            <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                            </svg>
                          ) : (
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                              <path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
                            </svg>
                          )}
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          )}
        </div>

        {/* ══ RIGHT COLUMN — Data Preview (only after ETL completes) ════════════ */}
        {previewVisible && (
          <div className="flex-1 min-w-0 w-full animate-in fade-in slide-in-from-bottom-3 duration-300">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <h2 className="text-base font-semibold">Preview Data</h2>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {MOCK_PREVIEW_ROWS.length} baris pertama · {flaggedCount} baris perlu review
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Legend chips */}
                    <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-full px-2.5 py-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500"/>Valid
                    </span>
                    <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-full px-2.5 py-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"/>Perlu Review
                    </span>
                    {/* Dismiss / discard button */}
                    <button
                      type="button"
                      onClick={handleDismissPreview}
                      title="Tutup preview"
                      className="ml-1 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                      aria-label="Tutup preview"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </CardHeader>

              {/* Scrollable table wrapper */}
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[480px]">
                    <thead>
                      <tr className="border-b bg-muted/40">
                        <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5 w-8">#</th>
                        {['Nama', 'Email', 'Telepon', 'Kota', 'Status'].map((col) => (
                          <th key={col} className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5 whitespace-nowrap">{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {MOCK_PREVIEW_ROWS.map((row, i) => (
                        <tr
                          key={i}
                          className={[
                            'border-b last:border-0 transition-colors group',
                            row.status === 'flagged' ? 'bg-yellow-50/60 hover:bg-yellow-50' : 'hover:bg-muted/30',
                          ].join(' ')}
                        >
                          <td className="px-4 py-2.5 text-muted-foreground text-xs font-mono">{i + 1}</td>
                          <td className="px-4 py-2.5 font-medium whitespace-nowrap">{row.nama}</td>
                          <td className="px-4 py-2.5 text-muted-foreground text-xs whitespace-nowrap">
                            {row.email
                              ? <span className={row.status === 'flagged' && row.flagReason?.includes('Email') ? 'text-yellow-700 font-medium' : ''}>{row.email}</span>
                              : <span className="text-yellow-600 italic">—</span>
                            }
                          </td>
                          <td className="px-4 py-2.5 text-muted-foreground font-mono text-xs whitespace-nowrap">
                            {row.telepon || <span className="text-yellow-600 italic not-italic">—</span>}
                          </td>
                          <td className="px-4 py-2.5 text-muted-foreground text-xs whitespace-nowrap">{row.kota}</td>
                          <td className="px-4 py-2.5">
                            {row.status === 'flagged' ? (
                              <span title={row.flagReason} className="inline-flex items-center gap-1 text-[11px] font-medium text-yellow-700 bg-yellow-100 rounded-full px-2 py-0.5 cursor-default">
                                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                                  <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                                </svg>
                                Review
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-green-700 bg-green-100 rounded-full px-2 py-0.5">
                                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="20 6 9 17 4 12"/>
                                </svg>
                                Valid
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-muted-foreground text-center py-3 border-t bg-muted/20 px-4">
                  Hanya menampilkan 8 baris pertama · Data lengkap tersedia setelah ETL selesai
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}