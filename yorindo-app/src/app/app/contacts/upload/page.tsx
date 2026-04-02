'use client'

import { useState, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
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

interface UploadedFile {
  id: string
  name: string
  size: number
  uploadedAt: string
  jobId: string
}

// ---------------------------------------------------------------------------
// In-memory mock store — replaces backend entirely
// ---------------------------------------------------------------------------
const mockJobStore: Record<string, EtlJob> = {}
const mockFileStore: UploadedFile[] = []

function createMockJob(jobId: string): EtlJob {
  return { jobId, status: 'queued', progress: 0, rowsProcessed: 0, totalRows: 0 }
}

function simulateJob(jobId: string) {
  const totalRows = Math.floor(Math.random() * 900) + 100
  mockJobStore[jobId] = { ...mockJobStore[jobId], status: 'processing', totalRows, progress: 0, rowsProcessed: 0 }

  let processed = 0
  const interval = setInterval(() => {
    processed += Math.floor(Math.random() * 60) + 20
    if (processed >= totalRows) {
      processed = totalRows
      const flaggedRows = Math.floor(Math.random() * 10)
      mockJobStore[jobId] = {
        ...mockJobStore[jobId],
        status: 'completed',
        progress: 100,
        rowsProcessed: totalRows,
        totalRows,
        flaggedRows,
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
  }, 800)
}

async function mockFetchJob(jobId: string): Promise<EtlJob> {
  await new Promise((r) => setTimeout(r, 50))
  return mockJobStore[jobId] ?? { jobId, status: 'failed', error: 'Job tidak ditemukan' }
}

async function mockUploadFile(file: File): Promise<{ jobId: string; fileId: string }> {
  await new Promise((r) => setTimeout(r, 700))
  const jobId = `job-${Math.random().toString(36).slice(2, 10)}`
  const fileId = `file-${Math.random().toString(36).slice(2, 10)}`
  mockJobStore[jobId] = createMockJob(jobId)
  mockFileStore.push({
    id: fileId,
    name: file.name,
    size: file.size,
    uploadedAt: new Date().toISOString(),
    jobId,
  })
  setTimeout(() => simulateJob(jobId), 300)
  return { jobId, fileId }
}

async function mockDeleteFile(fileId: string): Promise<void> {
  await new Promise((r) => setTimeout(r, 400))
  const idx = mockFileStore.findIndex((f) => f.id === fileId)
  if (idx !== -1) mockFileStore.splice(idx, 1)
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [jobId, setJobId] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set())
  const inputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()

  const { data: job } = useQuery<EtlJob>({
    queryKey: ['etl-job', jobId],
    queryFn: () => mockFetchJob(jobId!),
    enabled: !!jobId,
    refetchInterval: (query) => {
      const status = (query.state.data as EtlJob | undefined)?.status
      return status === 'queued' || status === 'processing' ? 1500 : false
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
      const { jobId: newJobId, fileId } = await mockUploadFile(file)
      const newEntry: UploadedFile = {
        id: fileId,
        name: file.name,
        size: file.size,
        uploadedAt: new Date().toISOString(),
        jobId: newJobId,
      }
      setUploadedFiles((prev) => [newEntry, ...prev])
      setJobId(newJobId)
      toast.success(`File diunggah. Job ID: ${newJobId}`)
      setFile(null)
      if (inputRef.current) inputRef.current.value = ''
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload gagal')
      toast.error('Upload gagal')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (fileEntry: UploadedFile) => {
    setDeletingIds((prev) => new Set(prev).add(fileEntry.id))
    try {
      await mockDeleteFile(fileEntry.id)
      setUploadedFiles((prev) => prev.filter((f) => f.id !== fileEntry.id))
      // If the deleted file's job is currently being tracked, clear it
      if (fileEntry.jobId === jobId) {
        setJobId(null)
        queryClient.removeQueries({ queryKey: ['etl-job', fileEntry.jobId] })
      }
      toast.success(`File "${fileEntry.name}" berhasil dihapus`)
    } catch {
      toast.error('Gagal menghapus file')
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev)
        next.delete(fileEntry.id)
        return next
      })
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

  const formatSize = (bytes: number) =>
    bytes < 1024 * 1024
      ? `${(bytes / 1024).toFixed(1)} KB`
      : `${(bytes / (1024 * 1024)).toFixed(1)} MB`

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

  return (
    <div className="max-w-xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/app/contacts" className="text-muted-foreground hover:text-foreground text-sm">
          ← Kembali ke Kontak
        </Link>
      </div>
      <h1 className="text-2xl font-bold mb-6">Upload Data Kontak</h1>

      {/* ── Upload card ── */}
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
              Dipilih: <strong>{file.name}</strong> ({formatSize(file.size)})
            </p>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button onClick={handleUpload} disabled={!file || uploading}>
            {uploading ? 'Mengunggah…' : 'Upload & Proses ETL'}
          </Button>
        </CardContent>
      </Card>

      {/* ── ETL job status ── */}
      {job && (
        <Card className="mb-6">
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
                  <Link href="/app/contacts/flagged" className="text-primary underline text-sm">
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

      {/* ── Uploaded files list ── */}
      {uploadedFiles.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold">File yang Diunggah</h2>
            <p className="text-sm text-muted-foreground">{uploadedFiles.length} file</p>
          </CardHeader>
          <CardContent className="space-y-2 p-0">
            {uploadedFiles.map((f, idx) => {
              const isDeleting = deletingIds.has(f.id)
              const fileJob = mockJobStore[f.jobId]
              const isActive = f.jobId === jobId

              return (
                <div
                  key={f.id}
                  className={[
                    'flex items-center justify-between gap-3 px-5 py-3 transition-colors',
                    idx !== uploadedFiles.length - 1 ? 'border-b' : '',
                    isDeleting ? 'opacity-50 pointer-events-none' : '',
                    isActive ? 'bg-muted/40' : '',
                  ].join(' ')}
                >
                  {/* File icon + info */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="shrink-0 w-8 h-8 rounded-md bg-muted flex items-center justify-center">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase">
                        {f.name.split('.').pop()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{f.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatSize(f.size)} · {formatDate(f.uploadedAt)}
                      </p>
                    </div>
                  </div>

                  {/* Status + delete */}
                  <div className="flex items-center gap-2 shrink-0">
                    {fileJob && (
                      <Badge className={`${STATUS_BADGE[fileJob.status]} text-[11px] px-2 py-0.5`}>
                        {STATUS_LABEL[fileJob.status]}
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(f)}
                      disabled={isDeleting}
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      aria-label={`Hapus ${f.name}`}
                    >
                      {isDeleting ? (
                        <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                        </svg>
                      ) : (
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                          <path d="M10 11v6M14 11v6" />
                          <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
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
  )
}