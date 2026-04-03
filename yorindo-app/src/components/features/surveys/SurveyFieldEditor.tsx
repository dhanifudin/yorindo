import React from 'react'
import type { SurveyField, SurveyFieldType } from '@/types/surveys'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Trash2, GripVertical, Plus, X } from 'lucide-react'

interface SurveyFieldEditorProps {
  field: SurveyField
  onChange: (updated: SurveyField) => void
  onRemove: () => void
  dragHandleProps?: React.HTMLAttributes<HTMLElement>
}

const FIELD_TYPE_LABELS: Record<SurveyFieldType, string> = {
  text: 'Jawaban Singkat',
  textarea: 'Paragraf',
  radio: 'Pilihan Ganda',
  select: 'Dropdown',
  checkboxes: 'Kotak Centang',
  range: 'Skala Linear',
  grid_radio: 'Kisi Pilihan Ganda',
  grid_checkbox: 'Kisi Kotak Centang',
  date: 'Tanggal',
  time: 'Waktu',
  section: 'Bagian Baru',
}

export function SurveyFieldEditor({ field, onChange, onRemove, dragHandleProps }: SurveyFieldEditorProps) {
  const updateField = (updates: Partial<SurveyField>) => {
    onChange({ ...field, ...updates })
  }

  const handleAddOption = () => {
    const options = field.options || []
    const nextVal = `Opsi ${options.length + 1}`
    updateField({ options: [...options, { label: nextVal, value: nextVal }] })
  }

  const handleUpdateOption = (index: number, label: string) => {
    const options = [...(field.options || [])]
    options[index] = { label, value: label }
    updateField({ options })
  }

  const handleRemoveOption = (index: number) => {
    const options = (field.options || []).filter((_, i) => i !== index)
    updateField({ options })
  }

  return (
    <Card className="group border shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="p-3 bg-muted/30 flex flex-row items-center gap-3 space-y-0">
        <div {...dragHandleProps} className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors">
          <GripVertical size={18} />
        </div>
        <div className="flex-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {FIELD_TYPE_LABELS[field.type]}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          onClick={onRemove}
        >
          <Trash2 size={16} />
        </Button>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 col-span-full sm:col-span-1">
            <Label className="text-xs">Label Pertanyaan</Label>
            <Input
              placeholder="Masukkan pertanyaan..."
              value={field.label}
              onChange={(e) => updateField({ label: e.target.value })}
              className="h-9"
            />
          </div>

          <div className="flex items-center space-x-2 mt-auto pb-2">
            {field.type !== 'section' && (
              <>
                <Switch
                  id={`required-${field.id}`}
                  checked={field.required}
                  onCheckedChange={(checked: boolean) => updateField({ required: checked })}
                />
                <Label htmlFor={`required-${field.id}`} className="text-xs cursor-pointer">Wajib diisi</Label>
              </>
            )}
          </div>
        </div>

        {/* Options for list types */}
        {(field.type === 'radio' || field.type === 'select' || field.type === 'checkboxes') && (
          <div className="space-y-3 pt-2">
            <Label className="text-xs">Opsi Jawaban</Label>
            <div className="space-y-2">
              {field.options?.map((opt, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    value={opt.label}
                    onChange={(e) => handleUpdateOption(i, e.target.value)}
                    className="h-8 text-sm"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => handleRemoveOption(i)}
                  >
                    <X size={14} />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                className="w-full h-8 border-dashed text-xs text-muted-foreground hover:text-violet-600 hover:border-violet-300"
                onClick={handleAddOption}
              >
                <Plus size={14} className="mr-1" /> Tambah Opsi
              </Button>
            </div>
          </div>
        )}

        {/* Range config */}
        {field.type === 'range' && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Minimum</Label>
              <Input
                type="number"
                value={field.minimum ?? 1}
                onChange={(e) => updateField({ minimum: parseInt(e.target.value, 10) })}
                className="h-9"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Maximum</Label>
              <Input
                type="number"
                value={field.maximum ?? 5}
                onChange={(e) => updateField({ maximum: parseInt(e.target.value, 10) })}
                className="h-9"
              />
            </div>
          </div>
        )}

        {/* Grid config */}
        {(field.type === 'grid_radio' || field.type === 'grid_checkbox') && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Baris (satu per baris)</Label>
              <Textarea
                value={field.rows?.join('\n') || ''}
                onChange={(e) => updateField({ rows: e.target.value.split('\n').filter(Boolean) })}
                className="h-24 text-sm"
                placeholder={'Baris 1\nBaris 2'}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Kolom (satu per baris)</Label>
              <Textarea
                value={field.columns?.join('\n') || ''}
                onChange={(e) => updateField({ columns: e.target.value.split('\n').filter(Boolean) })}
                className="h-24 text-sm"
                placeholder={'Kolom 1\nKolom 2'}
              />
            </div>
          </div>
        )}

        {/* Section description */}
        {field.type === 'section' && (
          <div className="space-y-2">
            <Label className="text-xs">Deskripsi Bagian</Label>
            <Textarea
              value={field.description || ''}
              onChange={(e) => updateField({ description: e.target.value })}
              className="h-20 text-sm"
              placeholder="Berikan konteks tambahan untuk bagian ini..."
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
