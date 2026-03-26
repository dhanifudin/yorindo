'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Form from '@rjsf/core'
import validator from '@rjsf/validator-ajv8'
import type { RJSFSchema, UiSchema } from '@rjsf/utils'
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

// ─── Internal builder state ───────────────────────────────────────────────────

interface FieldDescriptor {
  key: string
  type: 'text' | 'single-choice' | 'multiple-choice'
  title: string
  required: boolean
  options: string[]
}

// ─── Conversion: builder state ↔ JSON Schema ─────────────────────────────────

function fieldsToJsonSchema(fields: FieldDescriptor[]): { schema: RJSFSchema; uiSchema: UiSchema } {
  const properties: RJSFSchema['properties'] = {}
  const required: string[] = []
  const uiSchema: UiSchema = {}

  for (const f of fields) {
    if (f.type === 'text') {
      properties[f.key] = { type: 'string', title: f.title }
    } else if (f.type === 'single-choice') {
      properties[f.key] = { type: 'string', title: f.title, enum: f.options }
    } else if (f.type === 'multiple-choice') {
      properties[f.key] = {
        type: 'array',
        title: f.title,
        items: { type: 'string', enum: f.options },
        uniqueItems: true,
      }
      uiSchema[f.key] = { 'ui:widget': 'checkboxes' }
    }
    if (f.required) required.push(f.key)
  }

  return {
    schema: { type: 'object', properties, ...(required.length ? { required } : {}) },
    uiSchema,
  }
}

function jsonSchemaToFields(schema: RJSFSchema, uiSchema: UiSchema): FieldDescriptor[] {
  if (!schema?.properties) return []
  const requiredSet = new Set(schema.required ?? [])

  return Object.entries(schema.properties).map(([key, prop]) => {
    const p = prop as RJSFSchema
    const isMultiple = uiSchema?.[key]?.['ui:widget'] === 'checkboxes' || p.type === 'array'
    const isSingle = Array.isArray(p.enum)

    let type: FieldDescriptor['type'] = 'text'
    let options: string[] = []

    if (isMultiple) {
      type = 'multiple-choice'
      options = ((p as any).items?.enum ?? []) as string[]
    } else if (isSingle) {
      type = 'single-choice'
      options = (p.enum ?? []) as string[]
    }

    return { key, type, title: p.title ?? key, required: requiredSet.has(key), options }
  })
}

// ─── Component ────────────────────────────────────────────────────────────────

interface SurveyBuilderProps {
  eventId: string
}

const TYPE_LABEL: Record<FieldDescriptor['type'], string> = {
  text: 'Teks Bebas',
  'single-choice': 'Pilihan Tunggal',
  'multiple-choice': 'Pilihan Ganda',
}

export function SurveyBuilder({ eventId }: SurveyBuilderProps) {
  const queryClient = useQueryClient()
  const [isExpanded, setIsExpanded] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [fields, setFields] = useState<FieldDescriptor[]>([])
  const [newOptionText, setNewOptionText] = useState<Record<string, string>>({})

  const { data: surveyData, isLoading } = useQuery<{ schema: RJSFSchema; uiSchema: UiSchema }>({
    queryKey: ['survey', eventId],
    queryFn: () => fetch(`/api/events/${eventId}/survey`).then((r) => r.json()),
    enabled: isExpanded,
  })

  useEffect(() => {
    if (surveyData?.schema) {
      setFields(jsonSchemaToFields(surveyData.schema, surveyData.uiSchema ?? {}))
    }
  }, [surveyData])

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { schema, uiSchema } = fieldsToJsonSchema(fields)
      const res = await fetch(`/api/events/${eventId}/survey`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schema, uiSchema }),
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
    const key = `q_${Date.now()}`
    setFields((prev) => [...prev, { key, type: 'text', title: '', required: false, options: [] }])
  }

  const removeField = (key: string) => setFields((prev) => prev.filter((f) => f.key !== key))

  const updateField = (key: string, updates: Partial<FieldDescriptor>) =>
    setFields((prev) => prev.map((f) => (f.key === key ? { ...f, ...updates } : f)))

  const moveField = (key: string, dir: 'up' | 'down') => {
    setFields((prev) => {
      const idx = prev.findIndex((f) => f.key === key)
      if (idx === -1) return prev
      const next = [...prev]
      const swapIdx = dir === 'up' ? idx - 1 : idx + 1
      if (swapIdx < 0 || swapIdx >= next.length) return prev
      ;[next[idx], next[swapIdx]] = [next[swapIdx], next[idx]]
      return next
    })
  }

  const addOption = (key: string) => {
    const text = newOptionText[key]?.trim()
    if (!text) return
    const field = fields.find((f) => f.key === key)
    if (!field) return
    updateField(key, { options: [...field.options, text] })
    setNewOptionText((prev) => ({ ...prev, [key]: '' }))
  }

  const removeOption = (key: string, opt: string) => {
    const field = fields.find((f) => f.key === key)
    if (!field) return
    updateField(key, { options: field.options.filter((o) => o !== opt) })
  }

  const { schema: previewSchema, uiSchema: previewUiSchema } = fieldsToJsonSchema(fields)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Survey Builder</h2>
          <div className="flex gap-2">
            {isExpanded && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPreview((v) => !v)}
              >
                {showPreview ? 'Sembunyikan Preview' : 'Preview Form'}
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => setIsExpanded((v) => !v)}>
              {isExpanded ? 'Tutup' : 'Buka Builder'}
            </Button>
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="h-16 bg-muted rounded animate-pulse" />
          ) : showPreview ? (
            /* ── RJSF live preview ── */
            <div className="border rounded-lg p-4">
              <p className="text-xs text-muted-foreground mb-3 font-medium uppercase">
                Preview (JSON Schema via react-jsonschema-form)
              </p>
              {fields.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">
                  Tambahkan pertanyaan terlebih dahulu untuk melihat preview.
                </p>
              ) : (
                <Form
                  schema={previewSchema}
                  uiSchema={previewUiSchema}
                  validator={validator}
                  onSubmit={() => {/* preview only */}}
                >
                  <Button size="sm" type="submit" variant="outline" className="mt-2">
                    Kirim (Preview)
                  </Button>
                </Form>
              )}
            </div>
          ) : (
            /* ── Field editor ── */
            <>
              {fields.length === 0 && (
                <p className="text-sm text-muted-foreground italic">
                  Belum ada pertanyaan. Klik "Tambah Pertanyaan" untuk mulai.
                </p>
              )}

              {fields.map((field, idx) => (
                <div key={field.key} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="flex flex-col gap-0.5">
                      <button
                        type="button"
                        onClick={() => moveField(field.key, 'up')}
                        disabled={idx === 0}
                        className="text-muted-foreground hover:text-foreground disabled:opacity-30 text-xs leading-none"
                      >▲</button>
                      <button
                        type="button"
                        onClick={() => moveField(field.key, 'down')}
                        disabled={idx === fields.length - 1}
                        className="text-muted-foreground hover:text-foreground disabled:opacity-30 text-xs leading-none"
                      >▼</button>
                    </div>
                    <span className="text-xs text-muted-foreground w-5">{idx + 1}.</span>
                    <Input
                      value={field.title}
                      onChange={(e) => updateField(field.key, { title: e.target.value })}
                      placeholder="Label pertanyaan..."
                      className="flex-1 h-8 text-sm"
                    />
                    <Select
                      value={field.type}
                      onValueChange={(v) => updateField(field.key, { type: v as FieldDescriptor['type'] })}
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
                        onChange={(e) => updateField(field.key, { required: e.target.checked })}
                        className="accent-primary"
                      />
                      Wajib
                    </label>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive h-8 px-2"
                      onClick={() => removeField(field.key)}
                    >×</Button>
                  </div>

                  {(field.type === 'single-choice' || field.type === 'multiple-choice') && (
                    <div className="pl-7 space-y-2">
                      <div className="flex flex-wrap gap-1">
                        {field.options.map((opt) => (
                          <Badge key={opt} className="bg-muted text-muted-foreground gap-1">
                            {opt}
                            <button
                              type="button"
                              onClick={() => removeOption(field.key, opt)}
                              className="hover:text-destructive"
                            >×</button>
                          </Badge>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          value={newOptionText[field.key] ?? ''}
                          onChange={(e) =>
                            setNewOptionText((prev) => ({ ...prev, [field.key]: e.target.value }))
                          }
                          onKeyDown={(e) => e.key === 'Enter' && addOption(field.key)}
                          placeholder="Tambah opsi..."
                          className="h-7 text-xs flex-1"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => addOption(field.key)}
                        >+</Button>
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
