'use client'

import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { Check, ChevronsLeftRight, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Contact {
  id: string
  name: string
  email: string | null
  phone: string | null
  city: string | null
  company: string | null
  serviceType: string | null
  jobTitle: string | null
}

interface DuplicatePair {
  id: string
  primary: Contact
  duplicate: Contact
  matchScore: number
  matchReasons: string[]
}

interface MergeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  pair: DuplicatePair | null
}

type FieldChoice = 'primary' | 'duplicate' | null

const FIELDS = [
  { key: 'name', label: 'Nama' },
  { key: 'phone', label: 'Telepon' },
  { key: 'email', label: 'Email' },
  { key: 'city', label: 'Kota' },
  { key: 'company', label: 'Perusahaan' },
  { key: 'serviceType', label: 'Industri' },
  { key: 'jobTitle', label: 'Jabatan' },
] as const

function FieldValue({ value }: { value: string | null }) {
  if (!value) return <span className="text-muted-foreground italic">—</span>
  return <span className="break-all">{value}</span>
}

export function MergeDialog({ open, onOpenChange, pair }: MergeDialogProps) {
  const queryClient = useQueryClient()
  const [selections, setSelections] = useState<Record<string, FieldChoice>>({})

  // Reset selections when a new pair is passed in
  useEffect(() => {
    if (!pair) return
    const init: Record<string, FieldChoice> = {}
    for (const field of FIELDS) {
      const primaryVal = pair.primary[field.key as keyof Contact]
      init[field.key] = primaryVal ? 'primary' : 'duplicate'
    }
    setSelections(init)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pair?.id])

  const mergeMutation = useMutation({
    mutationFn: async ({ pairId, primaryId, fieldSelections }: {
      pairId: string
      primaryId: string
      fieldSelections: Record<string, FieldChoice>
    }) => {
      const res = await fetch(`/api/contacts/${primaryId}/merge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fieldSelections }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error?.message ?? 'Gagal menggabungkan kontak')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('Kontak berhasil digabungkan')
      queryClient.invalidateQueries({ queryKey: ['contacts-duplicates'] })
      onOpenChange(false)
      setSelections({})
    },
    onError: (err: Error) => toast.error(err.message ?? 'Gagal menggabungkan kontak'),
  })

  if (!pair) return null

  const handleMerge = () => {
    mergeMutation.mutate({
      pairId: pair.id,
      primaryId: pair.primary.id,
      fieldSelections: selections,
    })
  }

  const updateSelection = (field: string, choice: FieldChoice) => {
    setSelections(prev => ({ ...prev, [field]: choice }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[1400px] w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Pilih Data untuk Digabungkan</DialogTitle>
          <DialogDescription>
            Klik pada nilai yang ingin disimpan untuk setiap field. Kontak lainnya akan dihapus.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Contact info headers */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="p-3 rounded-lg border bg-muted/30">
              <div className="font-medium">{pair.primary.name}</div>
              <Badge variant="outline" className="text-[10px] mt-1">Kontak 1</Badge>
            </div>
            <div className="p-3 rounded-lg border bg-muted/30">
              <div className="font-medium">{pair.duplicate.name}</div>
              <Badge variant="outline" className="text-[10px] mt-1">Kontak 2</Badge>
            </div>
          </div>

          <Separator />

          {/* Field selection rows */}
          <div className="space-y-4">
            {FIELDS.map((field) => {
              const primaryVal = pair.primary[field.key as keyof Contact]
              const duplicateVal = pair.duplicate[field.key as keyof Contact]
              const currentSelection = selections[field.key] || (primaryVal ? 'primary' : 'duplicate')

              return (
                <div key={field.key} className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground">{field.label}</div>
                  <div className="grid grid-cols-2 gap-3">
                    {/* Primary value */}
                    <button
                      type="button"
                      onClick={() => updateSelection(field.key, 'primary')}
                      className={cn(
                        'flex items-center gap-2 p-3 rounded-lg border text-left transition-colors',
                        currentSelection === 'primary'
                          ? 'border-primary bg-primary/5 ring-1 ring-primary'
                          : 'border-border hover:bg-muted/50'
                      )}
                    >
                      <div className={cn(
                        'flex items-center justify-center w-5 h-5 rounded-full border shrink-0',
                        currentSelection === 'primary'
                          ? 'border-primary bg-primary'
                          : 'border-muted-foreground'
                      )}>
                        {currentSelection === 'primary' && (
                          <Check className="w-3 h-3 text-primary-foreground" />
                        )}
                      </div>
                      <span className="text-sm">
                        <FieldValue value={primaryVal} />
                      </span>
                    </button>

                    {/* Duplicate value */}
                    <button
                      type="button"
                      onClick={() => updateSelection(field.key, 'duplicate')}
                      className={cn(
                        'flex items-center gap-2 p-3 rounded-lg border text-left transition-colors',
                        currentSelection === 'duplicate'
                          ? 'border-primary bg-primary/5 ring-1 ring-primary'
                          : 'border-border hover:bg-muted/50'
                      )}
                    >
                      <div className={cn(
                        'flex items-center justify-center w-5 h-5 rounded-full border shrink-0',
                        currentSelection === 'duplicate'
                          ? 'border-primary bg-primary'
                          : 'border-muted-foreground'
                      )}>
                        {currentSelection === 'duplicate' && (
                          <Check className="w-3 h-3 text-primary-foreground" />
                        )}
                      </div>
                      <span className="text-sm">
                        <FieldValue value={duplicateVal} />
                      </span>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mergeMutation.isPending}>
            Batal
          </Button>
          <Button onClick={handleMerge} disabled={mergeMutation.isPending}>
            {mergeMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                Menggabungkan...
              </>
            ) : (
              <>
                <ChevronsLeftRight className="w-4 h-4 mr-1" />
                Gabungkan Kontak
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
