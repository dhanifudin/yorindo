'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { RJSFSchema, UiSchema } from '@rjsf/utils'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Plus, Trash2, ArrowUp, ArrowDown, Eye, EyeOff } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────

interface FieldDescriptor {
  key: string
  type: 'text' | 'single-choice' | 'multiple-choice'
  title: string
  required: boolean
  options: string[]
}

const TYPE_LABEL: Record<FieldDescriptor['type'], string> = {
  text: 'Teks Bebas',
  'single-choice': 'Pilihan Tunggal',
  'multiple-choice': 'Pilihan Ganda',
}

// ─── Schema Conversion ────────────────────────────────────────────────────

function fieldsToJsonSchema(fields: FieldDescriptor[]): {
  schema: RJSFSchema
  uiSchema: UiSchema
} {
  const properties: RJSFSchema['properties'] = {}
  const required: string[] = []
  const uiSchema: UiSchema = {}

  fields.forEach((f) => {
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
  })

  return {
    schema: {
      type: 'object',
      properties,
      ...(required.length > 0 && { required }),
    },
    uiSchema,
  }
}

function jsonSchemaToFields(schema: RJSFSchema, uiSchema: UiSchema = {}): FieldDescriptor[] {
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
      options = ((p.items as RJSFSchema)?.enum ?? []) as string[]
    } else if (isSingle) {
      type = 'single-choice'
      options = (p.enum ?? []) as string[]
    }

    return {
      key,
      type,
      title: p.title ?? key,
      required: requiredSet.has(key),
      options,
    }
  })
}

// ─── Component ────────────────────────────────────────────────────────────

interface SurveyBuilderProps {
  eventId: string
}

export function SurveyBuilder({ eventId }: SurveyBuilderProps) {
  const queryClient = useQueryClient()

  const [isExpanded, setIsExpanded] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [fields, setFields] = useState<FieldDescriptor[]>([])
  const [newOptionText, setNewOptionText] = useState<Record<string, string>>({})

  const { data: surveyData, isLoading } = useQuery({
    queryKey: ['survey', eventId],
    queryFn: () => fetch(`/api/events/${eventId}/survey`).then((r) => r.json()),
    enabled: isExpanded,
  })

  // Sync server data
  useEffect(() => {
    if (surveyData?.schema) {
      setFields(jsonSchemaToFields(surveyData.schema, surveyData.uiSchema ?? {}))
    }
  }, [surveyData])

  const validateFields = (): boolean => {
    for (const f of fields) {
      if (!f.title.trim()) {
        toast.error('Semua pertanyaan harus memiliki label')
        return false
      }
      if ((f.type === 'single-choice' || f.type === 'multiple-choice') && f.options.length === 0) {
        toast.error(`Pertanyaan "${f.title}" harus memiliki minimal satu opsi`)
        return false
      }
    }
    return true
  }

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

  // Field Actions
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

  const removeOption = (key: string, opt: string) =>
    updateField(key, {
      options: fields.find((f) => f.key === key)?.options.filter((o) => o !== opt) || [],
    })

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold">Survey Builder</CardTitle>

          <div className="flex gap-3">
            {isExpanded && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
                className="gap-2"
              >
                {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                {showPreview ? 'Sembunyikan Preview' : 'Tampilkan Preview'}
              </Button>
            )}

            <Button variant="outline" size="sm" onClick={() => setIsExpanded(!isExpanded)}>
              {isExpanded ? 'Tutup' : 'Buka Builder'}
            </Button>
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-6">
          {isLoading ? (
            <div className="h-32 rounded-2xl bg-muted animate-pulse" />
          ) : showPreview ? (
            // ── BEAUTIFUL PREVIEW SECTION ──
            <Card className="border border-border shadow-sm overflow-hidden">
              <CardHeader className="bg-muted/50 border-b pb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Eye className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="uppercase text-xs tracking-[2px] text-muted-foreground font-medium">
                      PREVIEW SURVEY
                    </p>
                    <CardTitle className="text-2xl mt-1">Formulir Survei</CardTitle>
                  </div>
                </div>
                <p className="text-muted-foreground mt-3 text-sm max-w-md">
                  Ini adalah tampilan yang akan dilihat responden. Desain sudah dioptimalkan agar terlihat profesional.
                </p>
              </CardHeader>

              <CardContent className="pt-10 pb-12 max-w-2xl mx-auto">
                {fields.length === 0 ? (
                  <div className="text-center py-24 text-muted-foreground">
                    <p className="text-lg">Belum ada pertanyaan</p>
                    <p className="mt-2">Tambahkan pertanyaan di mode builder untuk melihat preview</p>
                  </div>
                ) : (
                  <div className="space-y-12">
                    {fields.map((field, index) => (
                      <div key={field.key} className="space-y-5">
                        {/* Question */}
                        <div className="flex gap-5">
                          <div className="font-semibold text-3xl text-primary/70 mt-1 w-10 flex-shrink-0">
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <h3 className="text-xl font-medium leading-tight">
                              {field.title}
                              {field.required && (
                                <span className="text-destructive ml-1.5 text-xl">*</span>
                              )}
                            </h3>
                          </div>
                        </div>

                        {/* Answer Input */}
                        <div className="pl-14">
                          {field.type === 'text' && (
                            <Input
                              placeholder="Masukkan jawaban Anda di sini..."
                              className="h-14 text-base placeholder:text-muted-foreground/70"
                              disabled
                            />
                          )}

                          {(field.type === 'single-choice' || field.type === 'multiple-choice') && (
                            <div className="space-y-4">
                              {field.options.length === 0 ? (
                                <p className="text-sm italic text-muted-foreground pl-2">
                                  Belum ada opsi jawaban
                                </p>
                              ) : (
                                field.options.map((option, i) => (
                                  <label
                                    key={i}
                                    className="flex items-center gap-4 group cursor-pointer bg-muted/30 hover:bg-muted/50 transition-all rounded-xl px-5 py-4 border border-transparent hover:border-border"
                                  >
                                    <input
                                      type={field.type === 'single-choice' ? 'radio' : 'checkbox'}
                                      name={field.key}
                                      disabled
                                      className={`w-5 h-5 accent-primary ${field.type === 'multiple-choice' ? 'rounded' : ''}`}
                                    />
                                    <span className="text-base text-foreground group-hover:text-primary transition-colors">
                                      {option}
                                    </span>
                                  </label>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}

                    {/* Submit Area */}
                    <div className="pt-8 border-t flex justify-center">
                      <Button
                        size="lg"
                        className="px-12 py-7 text-lg font-medium shadow-lg hover:shadow-xl transition-all active:scale-[0.985]"
                        onClick={() => toast.info('Ini hanya preview — jawaban tidak akan disimpan')}
                      >
                        Kirim Jawaban
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            // ── BUILDER SECTION (tidak berubah) ──
            <>
              {fields.length === 0 && (
                <div className="border border-dashed rounded-2xl p-12 text-center">
                  <p className="text-muted-foreground">Belum ada pertanyaan ditambahkan</p>
                  <Button onClick={addField} className="mt-4" variant="outline">
                    <Plus className="mr-2 h-4 w-4" />
                    Tambah Pertanyaan Pertama
                  </Button>
                </div>
              )}

              <div className="space-y-5">
                {fields.map((field, index) => (
                  <Card key={field.key} className="overflow-hidden">
                    <CardContent className="p-6">
                      <div className="flex gap-4">
                        {/* Order Controls */}
                        <div className="flex flex-col gap-1 pt-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => moveField(field.key, 'up')}
                            disabled={index === 0}
                            className="h-8 w-8"
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => moveField(field.key, 'down')}
                            disabled={index === fields.length - 1}
                            className="h-8 w-8"
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                        </div>

                        {/* Main Content */}
                        <div className="flex-1 space-y-5">
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-sm text-muted-foreground w-6">
                              {index + 1}.
                            </span>

                            <Input
                              value={field.title}
                              onChange={(e) => updateField(field.key, { title: e.target.value })}
                              placeholder="Tulis pertanyaan di sini..."
                              className="text-base"
                            />

                            <Select
                              value={field.type}
                              onValueChange={(value) => updateField(field.key, { type: value as FieldDescriptor['type'] })}
                            >
                              <SelectTrigger className="w-52">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(TYPE_LABEL).map(([val, label]) => (
                                  <SelectItem key={val} value={val}>
                                    {label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            <label className="flex items-center gap-2 cursor-pointer text-sm whitespace-nowrap">
                              <input
                                type="checkbox"
                                checked={field.required}
                                onChange={(e) => updateField(field.key, { required: e.target.checked })}
                                className="accent-primary scale-110"
                              />
                              Wajib
                            </label>

                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeField(field.key)}
                              className="text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-5 w-5" />
                            </Button>
                          </div>

                          {/* Options Section */}
                          {(field.type === 'single-choice' || field.type === 'multiple-choice') && (
                            <div className="pl-9 space-y-3">
                              <div className="flex flex-wrap gap-2">
                                {field.options.map((option) => (
                                  <Badge
                                    key={option}
                                    variant="secondary"
                                    className="text-sm px-4 py-1.5 flex items-center gap-2"
                                  >
                                    {option}
                                    <button
                                      onClick={() => removeOption(field.key, option)}
                                      className="text-muted-foreground hover:text-destructive"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </Badge>
                                ))}
                              </div>

                              <div className="flex gap-2">
                                <Input
                                  value={newOptionText[field.key] || ''}
                                  onChange={(e) =>
                                    setNewOptionText((prev) => ({ ...prev, [field.key]: e.target.value }))
                                  }
                                  onKeyDown={(e) => e.key === 'Enter' && addOption(field.key)}
                                  placeholder="Ketik opsi baru..."
                                  className="h-10"
                                />
                                <Button onClick={() => addOption(field.key)} size="sm" variant="outline">
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Bottom Actions */}
              <div className="flex gap-3 pt-4">
                <Button onClick={addField} variant="outline" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Tambah Pertanyaan
                </Button>

                <Button
                  onClick={() => validateFields() && saveMutation.mutate()}
                  disabled={saveMutation.isPending || fields.length === 0}
                  className="px-8"
                >
                  {saveMutation.isPending ? 'Menyimpan...' : 'Simpan Survey'}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      )}
    </Card>
  )
}