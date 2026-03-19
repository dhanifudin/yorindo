'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'

interface SurveyField {
  id: string
  type: 'text' | 'single-choice' | 'multiple-choice'
  label: string
  required: boolean
  options?: string[]
}

interface SurveySchema {
  fields: SurveyField[]
}

interface SurveyBuilderProps {
  eventId: string
}

export function SurveyBuilder({ eventId }: SurveyBuilderProps) {
  const queryClient = useQueryClient()
  const [isExpanded, setIsExpanded] = useState(false)
  const [fields, setFields] = useState<SurveyField[]>([])
  const [newOptionText, setNewOptionText] = useState<Record<string, string>>({})

  const { data: surveyData, isLoading } = useQuery<SurveySchema>({
    queryKey: ['survey', eventId],
    queryFn: () => fetch(`/api/events/${eventId}/survey`).then((r) => r.json()),
    enabled: isExpanded,
  })

  useEffect(() => {
    if (surveyData?.fields) {
      setFields(surveyData.fields)
    }
  }, [surveyData])

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/events/${eventId}/survey`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields }),
      })
      if (!res.ok) throw new Error('Gagal menyimpan survey')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['survey', eventId] })
      toast.success('Survey berhasil disimpan')
    },
    onError: () => toast.error('Gagal menyimpan survey'),
  })

  const addField = () => {
    const newField: SurveyField = {
      id: `q-${Date.now()}`,
      type: 'text',
      label: '',
      required: false,
      options: [],
    }
    setFields((prev) => [...prev, newField])
  }

  const removeField = (id: string) => {
    setFields((prev) => prev.filter((f) => f.id !== id))
  }

  const updateField = (id: string, updates: Partial<SurveyField>) => {
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...updates } : f)))
  }

  const moveField = (id: string, dir: 'up' | 'down') => {
    setFields((prev) => {
      const idx = prev.findIndex((f) => f.id === id)
      if (idx === -1) return prev
      const next = [...prev]
      const swapIdx = dir === 'up' ? idx - 1 : idx + 1
      if (swapIdx < 0 || swapIdx >= next.length) return prev
      ;[next[idx], next[swapIdx]] = [next[swapIdx], next[idx]]
      return next
    })
  }

  const addOption = (fieldId: string) => {
    const text = newOptionText[fieldId]?.trim()
    if (!text) return
    updateField(fieldId, {
      options: [...(fields.find((f) => f.id === fieldId)?.options ?? []), text],
    })
    setNewOptionText((prev) => ({ ...prev, [fieldId]: '' }))
  }

  const removeOption = (fieldId: string, option: string) => {
    const field = fields.find((f) => f.id === fieldId)
    if (!field) return
    updateField(fieldId, { options: field.options?.filter((o) => o !== option) })
  }

  const TYPE_LABEL: Record<SurveyField['type'], string> = {
    text: 'Teks Bebas',
    'single-choice': 'Pilihan Tunggal',
    'multiple-choice': 'Pilihan Ganda',
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Survey Builder</h2>
          <Button variant="outline" size="sm" onClick={() => setIsExpanded((v) => !v)}>
            {isExpanded ? 'Tutup' : 'Buka Builder'}
          </Button>
        </div>
      </CardHeader>
      {isExpanded && (
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="h-16 bg-muted rounded animate-pulse" />
          ) : (
            <>
              {fields.length === 0 && (
                <p className="text-sm text-muted-foreground italic">
                  Belum ada pertanyaan. Klik "Tambah Pertanyaan" untuk mulai.
                </p>
              )}
              {fields.map((field, idx) => (
                <div key={field.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="flex flex-col gap-0.5">
                      <button
                        type="button"
                        onClick={() => moveField(field.id, 'up')}
                        disabled={idx === 0}
                        className="text-muted-foreground hover:text-foreground disabled:opacity-30 text-xs leading-none"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        onClick={() => moveField(field.id, 'down')}
                        disabled={idx === fields.length - 1}
                        className="text-muted-foreground hover:text-foreground disabled:opacity-30 text-xs leading-none"
                      >
                        ▼
                      </button>
                    </div>
                    <span className="text-xs text-muted-foreground w-5">{idx + 1}.</span>
                    <Input
                      value={field.label}
                      onChange={(e) => updateField(field.id, { label: e.target.value })}
                      placeholder="Label pertanyaan..."
                      className="flex-1 h-8 text-sm"
                    />
                    <Select
                      value={field.type}
                      onValueChange={(v) => updateField(field.id, { type: v as SurveyField['type'] })}
                    >
                      <SelectTrigger className="h-8 w-40 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(TYPE_LABEL).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <label className="flex items-center gap-1 text-xs text-muted-foreground cursor-pointer">
                      <input
                        type="checkbox"
                        checked={field.required}
                        onChange={(e) => updateField(field.id, { required: e.target.checked })}
                        className="accent-primary"
                      />
                      Wajib
                    </label>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive h-8 px-2"
                      onClick={() => removeField(field.id)}
                    >
                      ×
                    </Button>
                  </div>

                  {(field.type === 'single-choice' || field.type === 'multiple-choice') && (
                    <div className="pl-7 space-y-2">
                      <div className="flex flex-wrap gap-1">
                        {field.options?.map((opt) => (
                          <Badge key={opt} className="bg-muted text-muted-foreground gap-1">
                            {opt}
                            <button
                              type="button"
                              onClick={() => removeOption(field.id, opt)}
                              className="hover:text-destructive"
                            >
                              ×
                            </button>
                          </Badge>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          value={newOptionText[field.id] ?? ''}
                          onChange={(e) =>
                            setNewOptionText((prev) => ({ ...prev, [field.id]: e.target.value }))
                          }
                          onKeyDown={(e) => e.key === 'Enter' && addOption(field.id)}
                          placeholder="Tambah opsi..."
                          className="h-7 text-xs flex-1"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => addOption(field.id)}
                        >
                          +
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={addField}>
                  + Tambah Pertanyaan
                </Button>
                <Button size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? 'Menyimpan…' : 'Simpan Survey'}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      )}
    </Card>
  )
}
