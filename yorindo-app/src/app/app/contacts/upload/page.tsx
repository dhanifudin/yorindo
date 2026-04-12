'use client'

import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import * as XLSX from 'xlsx'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { getUserFriendlyError } from '@/lib/error-messages'
import Link from 'next/link'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { AlertCircle, CheckCircle2, FileSpreadsheet, Upload } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ImportJob {
  jobId: string
  status: 'queued' | 'processing' | 'completed' | 'failed'
  progress?: number
  rowsProcessed?: number
  totalRows?: number
  flaggedRows?: number
  completedAt?: string
  error?: string
}

interface PreviewData {
  headers: string[]
  rows: Record<string, string>[]
  rowCount: number
}

// ─── API helpers ──────────────────────────────────────────────────────────────

async function uploadFile(file: File): Promise<{ jobId: string }> {
  const form = new FormData()
  form.append('file', file)
  form.append('uploadSource', 'contact_import')

  const res = await fetch('/api/etl/upload', { method: 'POST', body: form })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.error?.message ?? `Upload gagal (${res.status})`)
  }
  return res.json()
}

async function fetchJobStatus(jobId: string): Promise<ImportJob> {
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

const STATUS_BADGE: Record<ImportJob['status'], string> = {
  queued:     'bg-muted text-muted-foreground',
  processing: 'bg-blue-100 text-blue-700',
  completed:  'bg-green-100 text-green-700',
  failed:     'bg-destructive/10 text-destructive',
}
const STATUS_LABEL: Record<ImportJob['status'], string> = {
  queued:     'Dalam Antrian',
  processing: 'Diproses',
  completed:  'Selesai',
  failed:     'Gagal',
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function UploadPage() {
  const [selectedFile, setSelectedFile]       = useState<File | null>(null)
  const [fileError, setFileError]             = useState<string | null>(null)
  const [uploading, setUploading]             = useState(false)
  const [isDragOver, setIsDragOver]           = useState(false)
  const [preview, setPreview]                 = useState<PreviewData | null>(null)

  const [activeJobId, setActiveJobId]         = useState<string | null>(null)
  const [job, setJob]                         = useState<ImportJob | null>(null)

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
    if (ext !== 'xlsx')
      return `Format ".${ext || '?'}" tidak didukung. Gunakan file .xlsx`
    if (f.size > 10 * 1024 * 1024)
      return 'File melebihi batas ukuran 10MB.'
    return null
  }, [])

  const readPreview = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = e.target?.result
        const workbook = XLSX.read(data, { type: 'binary' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const jsonData: Record<string, unknown>[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' })

        if (jsonData.length === 0) {
          setFileError('File tidak memiliki data')
          setPreview(null)
          return
        }

        const headers = Object.keys(jsonData[0])
        const rows = jsonData.slice(0, 5).map(row => {
          const obj: Record<string, string> = {}
          for (const key of headers) {
            obj[key] = String(row[key] ?? '')
          }
          return obj
        })

        setPreview({ headers, rows, rowCount: jsonData.length })
        setFileError(null)
      } catch {
        setFileError('Gagal membaca file. Pastikan file .xlsx valid')
        setPreview(null)
      }
    }
    reader.onerror = () => {
      setFileError('Gagal membaca file')
      setPreview(null)
    }
    reader.readAsBinaryString(file)
  }, [])

  const applyFile = useCallback((f: File) => {
    const err = validateFile(f)
    if (err) {
      setFileError(err)
      setSelectedFile(null)
      setPreview(null)
      toast.error('File tidak dapat diunggah', { description: err, duration: 4000 })
      return
    }
    setFileError(null)
    setSelectedFile(f)
    readPreview(f)
  }, [validateFile, readPreview])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (f) applyFile(f)
  }
  const handleClearFile = () => {
    setSelectedFile(null); setFileError(null); setPreview(null)
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
    setPreview(null)
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }

    try {
      const { jobId } = await uploadFile(selectedFile)
      setActiveJobId(jobId)
      setJob({ jobId, status: 'queued', progress: 0 })
      toast.success(`File diunggah. Job ID: ${jobId}`)
      setSelectedFile(null)
      if (inputRef.current) inputRef.current.value = ''
    } catch (err) {
      const msg = getUserFriendlyError(err)
      setFileError(msg)
      toast.error('Upload gagal', { description: msg })
    } finally {
      setUploading(false)
    }
  }

  // ── Detected column mapping ──────────────────────────────────────────────────

  const detectedMapping = useMemo(() => {
    if (!preview) return {}
    const fieldAliases: Record<string, string[]> = {
      name: ['nama lengkap', 'nama', 'name', 'nama_lengkap'],
      phone: ['no hp', 'no handphone', 'no hp / handphone', 'phone', 'telepon', 'phone_number', 'no_hp', 'whatsapp', 'wa', 'hp', 'telp', 'no telp'],
      email: ['email', 'e-mail', 'surel'],
      company: ['perusahaan', 'company', 'instansi', 'nama perusahaan', 'nama instansi', 'company_name', 'organization', 'organisasi'],
      jobTitle: ['jabatan', 'job title', 'position', 'posisi', 'jabatan_posisi', 'title'],
      city: ['kota', 'city', 'asal kota', 'asal_kota', 'kota_asal', 'location', 'lokasi'],
    }

    const mapping: Record<string, string> = {}
    const usedHeaders = new Set<string>()

    for (const [field, aliases] of Object.entries(fieldAliases)) {
      for (const header of preview.headers) {
        if (usedHeaders.has(header)) continue
        const normalizedHeader = header.toLowerCase().trim()
        if (aliases.some(alias => normalizedHeader.includes(alias) || alias.includes(normalizedHeader))) {
          mapping[field] = header
          usedHeaders.add(header)
          break
        }
      }
    }

    return mapping
  }, [preview])

  const mappedFields = useMemo(() => {
    const fields = ['name', 'phone', 'email', 'company', 'jobTitle', 'city']
    const labels: Record<string, string> = {
      name: 'Nama',
      phone: 'Telepon',
      email: 'Email',
      company: 'Perusahaan',
      jobTitle: 'Jabatan',
      city: 'Kota',
    }
    return fields.map(f => ({ field: f, label: labels[f], header: detectedMapping[f] ?? null }))
  }, [detectedMapping])

  const allFieldsMapped = mappedFields.every(m => m.header !== null)

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-5 pb-10 max-w-[800px]">
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
          <p className="text-sm text-muted-foreground">Format yang diterima: .xlsx — maks 10MB</p>
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
              <input ref={inputRef} type="file" accept=".xlsx" onChange={handleFileChange} className="sr-only" />

              <div className={`transition-transform duration-200 ${isDragOver ? 'scale-110 -translate-y-1' : ''}`}>
                <FileSpreadsheet width={44} height={44} className={isDragOver ? 'text-primary' : 'text-muted-foreground/40'} />
              </div>

              <div className="text-center space-y-0.5">
                <p className="text-sm font-medium">{isDragOver ? 'Lepaskan file di sini' : 'Seret & lepas file, atau klik untuk pilih'}</p>
                <p className="text-xs text-muted-foreground">.xlsx · maks 10MB</p>
              </div>

              <div className="flex gap-2">
                <span className="text-[11px] font-mono font-medium uppercase px-2 py-0.5 rounded bg-muted text-muted-foreground border">.xlsx</span>
              </div>
            </div>
          )}

          {/* Selected file chip */}
          {selectedFile && (
            <div className="flex items-center gap-3 rounded-md border bg-muted/40 px-3 py-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10">
                <FileSpreadsheet className="w-5 h-5 text-primary" />
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

          {fileError && <p className="text-sm text-destructive flex items-center gap-2"><AlertCircle className="w-4 h-4" />{fileError}</p>}

          {uploading && (
            <div className="flex items-center gap-3 rounded-md border border-blue-200 bg-blue-50 px-3 py-2.5">
              <svg className="h-4 w-4 animate-spin text-blue-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
              </svg>
              <p className="text-sm text-blue-700">Mengunggah file ke server…</p>
            </div>
          )}

          {/* Preview section */}
          {preview && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Preview Data</h3>
                <Badge variant="secondary">{preview.rowCount} baris total</Badge>
              </div>

              {/* Column mapping status */}
              <div className="rounded-md border p-3 space-y-2">
                <div className="flex items-center gap-2">
                  {allFieldsMapped ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-yellow-600" />
                  )}
                  <span className="text-sm font-medium">
                    {allFieldsMapped ? 'Semua kolom terdeteksi' : `${Object.values(detectedMapping).length}/${mappedFields.length} kolom terdeteksi`}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {mappedFields.map((m) => (
                    <div key={m.field} className="flex items-center gap-1">
                      <span className="text-muted-foreground">{m.label}:</span>
                      <span className={m.header ? 'text-green-700 font-medium' : 'text-red-700'}>
                        {m.header || 'Tidak terdeteksi'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Data preview table */}
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {preview.headers.map((h) => (
                        <TableHead key={h} className="whitespace-nowrap text-xs">{h}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.rows.map((row, i) => (
                      <TableRow key={i}>
                        {preview.headers.map((h) => (
                          <TableCell key={h} className="text-xs max-w-[150px] truncate">{row[h] || <span className="text-muted-foreground italic">—</span>}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          <Button onClick={handleUpload} disabled={!selectedFile || uploading || !allFieldsMapped} className="w-full">
            {uploading ? 'Mengunggah…' : 'Upload & Proses Data'}
          </Button>

          {!allFieldsMapped && selectedFile && (
            <p className="text-xs text-muted-foreground text-center">
              Pastikan file memiliki kolom yang diperlukan: Nama, Telepon, Email
            </p>
          )}
        </CardContent>
      </Card>

      {/* Import job status */}
      {job && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">Status Pemrosesan</h2>
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
                {job.rowsProcessed !== undefined && <p>Berhasil diimpor: <strong>{job.rowsProcessed}</strong></p>}
                {job.flaggedRows !== undefined && job.flaggedRows > 0 && (
                  <p>Data dengan catatan (flag): <strong>{job.flaggedRows}</strong></p>
                )}
                <Link href="/app/contacts" className="text-primary underline text-sm block mt-2">
                  Lihat database kontak →
                </Link>
              </div>
            )}
            {job.status === 'failed' && (
              <p className="text-sm text-destructive flex items-center gap-2"><AlertCircle className="w-4 h-4" />{job.error ?? 'Job gagal — periksa log server'}</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
