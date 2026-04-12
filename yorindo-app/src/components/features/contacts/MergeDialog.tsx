'use client'

import React, { useState, useEffect } from 'react'
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { Check, ChevronsLeftRight, Loader2 } from 'lucide-react'

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

type FieldChoice = 'primary' | 'duplicate'

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
  return <span>{value}</span>
}

export function MergeDialog({ open, onOpenChange, pair }: MergeDialogProps) {
  const queryClient = useQueryClient()
  const [selections, setSelections] = useState<Record<string, FieldChoice>>({})

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

  // Initialize selections when dialog opens with a pair
  useEffect(() => {
    if (pair && open) {
      const init: Record<string, FieldChoice> = {}
      for (const field of FIELDS) {
        // Default to primary if it has a value, otherwise duplicate
        const primaryVal = pair.primary[field.key as keyof Contact]
        init[field.key] = primaryVal ? 'primary' : 'duplicate'
      }
      setSelections(init)
    }
  }, [pair, open])

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
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Pilih Data untuk Digabungkan</DialogTitle>
          <DialogDescription>
            Pilih nilai yang ingin disimpan untuk setiap field. Kontak lainnya akan dihapus.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Contact info headers */}
          <div className="grid grid-cols-[140px_1fr_1fr] gap-3 text-sm">
            <div className="text-muted-foreground font-medium">Field</div>
            <div>
              <div className="font-medium">{pair.primary.name}</div>
              <Badge variant="outline" className="text-xs mt-1">Kontak 1</Badge>
            </div>
            <div>
              <div className="font-medium">{pair.duplicate.name}</div>
              <Badge variant="outline" className="text-xs mt-1">Kontak 2</Badge>
            </div>
          </div>

          <Separator />

          {/* Field selection rows */}
          {FIELDS.map((field) => {
            const primaryVal = pair.primary[field.key as keyof Contact]
            const duplicateVal = pair.duplicate[field.key as keyof Contact]
            const currentSelection = selections[field.key] || (primaryVal ? 'primary' : 'duplicate')

            return (
              <div key={field.key} className="grid grid-cols-[140px_1fr_1fr] gap-3 items-center">
                <div className="text-sm font-medium">{field.label}</div>

                {/* Primary value */}
                <div className="flex items-center gap-2">
                  <RadioGroup
                    value={currentSelection}
                    onValueChange={(v) => updateSelection(field.key, v as FieldChoice)}
                    className="flex items-center"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="primary" id={`${field.key}-primary`} />
                      <Label htmlFor={`${field.key}-primary`} className="text-sm font-normal cursor-pointer">
                        <FieldValue value={primaryVal} />
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Duplicate value */}
                <div className="flex items-center gap-2">
                  <RadioGroup
                    value={currentSelection}
                    onValueChange={(v) => updateSelection(field.key, v as FieldChoice)}
                    className="flex items-center"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="duplicate" id={`${field.key}-duplicate`} />
                      <Label htmlFor={`${field.key}-duplicate`} className="text-sm font-normal cursor-pointer">
                        <FieldValue value={duplicateVal} />
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>
            )
          })}
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
                <Check className="w-4 h-4 mr-1" />
                Gabungkan Kontak
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
