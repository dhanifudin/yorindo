import React, { useState, useEffect, useRef } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { SurveyField, SurveyFieldType } from '@/types/surveys'
import { useSurveySchema, useSaveSurveySchema } from '@/hooks/useSurveys'
import { buildSurveySchema, schemaToFields } from './surveySchemaBuilder'
import { SurveyFieldEditor } from './SurveyFieldEditor'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Save, Eye, Loader2, AlertCircle } from 'lucide-react'
import { makeMockCuid2 } from '@/mocks/handlers/id'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'

interface SurveyBuilderTabProps {
  eventId: string
  type: 'registration' | 'post-event'
  postSurveyEnabled?: boolean
  onTogglePostSurvey?: (enabled: boolean) => void
  onPreview: (fields: SurveyField[]) => void
}

const FIELD_TYPES: { value: SurveyFieldType; label: string }[] = [
  { value: 'text', label: 'Jawaban Singkat' },
  { value: 'textarea', label: 'Paragraf' },
  { value: 'radio', label: 'Pilihan Ganda' },
  { value: 'checkboxes', label: 'Kotak Centang' },
  { value: 'select', label: 'Dropdown' },
  { value: 'range', label: 'Skala Linear' },
  { value: 'grid_radio', label: 'Kisi Pilihan Ganda' },
  { value: 'grid_checkbox', label: 'Kisi Kotak Centang' },
  { value: 'date', label: 'Tanggal' },
  { value: 'time', label: 'Waktu' },
  { value: 'section', label: 'Bagian Baru' },
]

interface SortableFieldProps {
  field: SurveyField
  onChange: (updated: SurveyField) => void
  onRemove: () => void
}

function SortableField({ field, onChange, onRemove }: SortableFieldProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: field.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 0,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className="touch-none">
      <SurveyFieldEditor
        field={field}
        onChange={onChange}
        onRemove={onRemove}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  )
}

export function SurveyBuilderTab({
  eventId,
  type,
  postSurveyEnabled,
  onTogglePostSurvey,
  onPreview,
}: SurveyBuilderTabProps) {
  const [fields, setFields] = useState<SurveyField[]>([])
  const [selectedType, setSelectedType] = useState<SurveyFieldType>('text')

  const { data: schema, isLoading, isError } = useSurveySchema(eventId, type)
  const saveMutation = useSaveSurveySchema(eventId)

  // Use a ref to track if initial data was loaded, preventing infinite effect loops
  const initialized = useRef(false)

  useEffect(() => {
    if (schema && !initialized.current) {
      initialized.current = true
      const loadedFields = schemaToFields(schema.schema, schema.uiSchema)
      setFields(loadedFields)
    }
  }, [schema])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleAddField = () => {
    const newField: SurveyField = {
      id: makeMockCuid2(),
      type: selectedType,
      label: 'Pertanyaan Baru',
      required: false,
    }

    if (['radio', 'select', 'checkboxes'].includes(selectedType)) {
      newField.options = [{ label: 'Opsi 1', value: 'Opsi 1' }]
    }

    if (selectedType === 'range') {
      newField.minimum = 1
      newField.maximum = 5
    }

    if (selectedType === 'grid_radio' || selectedType === 'grid_checkbox') {
      newField.rows = ['Baris 1']
      newField.columns = ['Kolom 1', 'Kolom 2']
    }

    setFields((prev) => [...prev, newField])
  }

  const handleUpdateField = (index: number, updated: SurveyField) => {
    setFields((prev) => {
      const next = [...prev]
      next[index] = updated
      return next
    })
  }

  const handleRemoveField = (index: number) => {
    setFields((prev) => prev.filter((_, i) => i !== index))
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setFields((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id)
        const newIndex = items.findIndex((i) => i.id === over.id)
        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }

  const handleSave = () => {
    const { schema: s, uiSchema: u } = buildSurveySchema(fields)
    saveMutation.mutate({ type, schema: s, uiSchema: u })
  }

  if (isLoading)
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
        <Loader2 className="animate-spin" size={32} />
        <p className="text-sm">Memuat desain survei...</p>
      </div>
    )

  if (isError)
    return (
      <div className="flex flex-col items-center justify-center py-20 text-destructive gap-3">
        <AlertCircle size={32} />
        <p className="text-sm text-center">Gagal memuat desain survei.<br />Silakan coba lagi nanti.</p>
      </div>
    )

  const isDisabled = type === 'post-event' && !postSurveyEnabled

  return (
    <div className="space-y-6">
      {type === 'post-event' && (
        <div className="flex items-center justify-between p-4 bg-violet-50/50 border border-violet-100 rounded-xl">
          <div className="space-y-0.5">
            <Label className="text-base font-semibold text-violet-900">Aktifkan Survei Post-Event</Label>
            <p className="text-xs text-violet-600/80">Kirimkan survei kepuasan kepada peserta setelah event berakhir.</p>
          </div>
          <Switch
            checked={postSurveyEnabled}
            onCheckedChange={onTogglePostSurvey}
            className="data-[state=checked]:bg-violet-600"
          />
        </div>
      )}

      <div className={`space-y-6 ${isDisabled ? 'opacity-50 pointer-events-none' : ''}`}>
        <div className="flex flex-wrap items-center justify-between gap-4 sticky top-0 bg-background/95 backdrop-blur z-20 py-3 border-b border-violet-100 px-1">
          <div className="flex items-center gap-2">
            <Select value={selectedType} onValueChange={(val) => setSelectedType(val as SurveyFieldType)}>
              <SelectTrigger className="w-[180px] h-9 border-violet-200">
                <SelectValue placeholder="Pilih tipe" />
              </SelectTrigger>
              <SelectContent>
                {FIELD_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={handleAddField} className="bg-violet-600 hover:bg-violet-700">
              <Plus size={16} className="mr-1" /> Tambah Pertanyaan
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => onPreview(fields)}>
              <Eye size={16} className="mr-1" /> Preview
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className="bg-violet-600 hover:bg-violet-700"
            >
              {saveMutation.isPending ? (
                <Loader2 size={16} className="animate-spin mr-1" />
              ) : (
                <Save size={16} className="mr-1" />
              )}
              {saveMutation.isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
            </Button>
          </div>
        </div>

        {fields.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-violet-100 rounded-2xl bg-violet-50/20">
            <p className="text-sm text-muted-foreground">
              Belum ada pertanyaan. Tambahkan pertanyaan pertama Anda di atas.
            </p>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-4 pb-20">
                {fields.map((field, index) => (
                  <SortableField
                    key={field.id}
                    field={field}
                    onChange={(updated) => handleUpdateField(index, updated)}
                    onRemove={() => handleRemoveField(index)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  )
}
