import React from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SurveyField } from '@/types/surveys'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { X, Eye, ClipboardCheck, MessageSquare, GripVertical, Star } from 'lucide-react'

interface FormPreviewModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  registrationFields: SurveyField[]
  postEventFields: SurveyField[]
  postSurveyEnabled: boolean
  eventStatus?: string
}

const FIXED_REGISTRATION_FIELDS: { id: string; label: string; required: boolean }[] = [
  { id: 'name', label: 'Nama Lengkap', required: true },
  { id: 'email', label: 'Email', required: true },
  { id: 'phone', label: 'Nomor Telepon', required: true },
  { id: 'company_name', label: 'Nama Perusahaan', required: false },
  { id: 'position', label: 'Jabatan', required: false },
  { id: 'industry_type', label: 'Industri', required: false },
]

function FieldPreview({ field }: { field: SurveyField | { id: string; label: string; required: boolean } }) {
  const isFixed = 'id' in field && !('type' in field)
  const f = isFixed ? field : field
  const type = isFixed ? 'text' : (field as SurveyField).type
  const required = isFixed ? field.required : (field as SurveyField).required
  const label = f.label

  if (type === 'section') {
    const sf = field as SurveyField
    return (
      <div className="space-y-2 py-4">
        <h3 className="text-lg font-semibold text-foreground">{sf.label}</h3>
        {sf.description && (
          <p className="text-sm text-muted-foreground">{sf.description}</p>
        )}
        <Separator />
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>

      {type === 'text' && (
        <Input placeholder="Ketik jawaban..." disabled className="bg-muted/30" />
      )}

      {type === 'textarea' && (
        <Textarea placeholder="Ketik paragraf..." disabled className="bg-muted/30 min-h-[80px]" />
      )}

      {type === 'radio' && (
        <RadioGroup disabled>
          {(field as SurveyField).options?.map((opt, i) => (
            <div key={i} className="flex items-center space-x-2">
              <RadioGroupItem value={opt.value} id={`radio-${f.id}-${i}`} />
              <Label htmlFor={`radio-${f.id}-${i}`} className="text-sm font-normal cursor-default">
                {opt.label}
              </Label>
            </div>
          ))}
        </RadioGroup>
      )}

      {type === 'select' && (
        <Select disabled>
          <SelectTrigger className="bg-muted/30">
            <SelectValue placeholder="Pilih salah satu..." />
          </SelectTrigger>
          <SelectContent>
            {(field as SurveyField).options?.map((opt, i) => (
              <SelectItem key={i} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {type === 'checkboxes' && (
        <div className="space-y-2">
          {(field as SurveyField).options?.map((opt, i) => (
            <div key={i} className="flex items-center space-x-2">
              <Checkbox id={`cb-${f.id}-${i}`} disabled />
              <Label htmlFor={`cb-${f.id}-${i}`} className="text-sm font-normal cursor-default">
                {opt.label}
              </Label>
            </div>
          ))}
        </div>
      )}

      {type === 'range' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{(field as SurveyField).minimum ?? 1}</span>
            <span>{(field as SurveyField).maximum ?? 5}</span>
          </div>
          <div className="flex gap-1">
            {Array.from({ length: (field as SurveyField).maximum ?? 5 }, (_, i) => (
              <button
                key={i}
                type="button"
                className="flex-1 h-8 rounded-md border bg-muted/30 hover:bg-primary/10 transition-colors disabled:opacity-50"
                disabled
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>
      )}

      {type === 'date' && (
        <Input type="date" disabled className="bg-muted/30" />
      )}

      {type === 'time' && (
        <Input type="time" disabled className="bg-muted/30" />
      )}
    </div>
  )
}

function SurveyPreview({ fields, title, description, fixedFields, submitLabel }: {
  fields: SurveyField[]
  title: string
  description: string
  fixedFields?: { id: string; label: string; required: boolean }[]
  submitLabel: string
}) {
  return (
    <div className="max-w-2xl mx-auto">
      <Card className="border shadow-sm">
        <CardHeader className="space-y-3 pb-6">
          <CardTitle className="text-xl">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {fixedFields?.map((f) => (
            <FieldPreview key={f.id} field={f} />
          ))}

          {fixedFields && fixedFields.length > 0 && fields.length > 0 && (
            <Separator className="my-4" />
          )}

          {fields.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">Belum ada pertanyaan survei ditambahkan.</p>
            </div>
          ) : (
            fields.map((field, i) => (
              <React.Fragment key={field.id}>
                <FieldPreview field={field} />
              </React.Fragment>
            ))
          )}

          <Separator className="my-4" />
          <Button className="w-full h-11 pointer-events-none" disabled>
            {submitLabel}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

export function FormPreviewModal({
  open,
  onOpenChange,
  registrationFields,
  postEventFields,
  postSurveyEnabled,
  eventStatus,
}: FormPreviewModalProps) {
  const isActive = eventStatus === 'active'
  const defaultTab = isActive ? 'post-event' : 'registration'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <Eye className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold">Preview Formulir</p>
                <p className="text-xs text-muted-foreground">
                  Tampilan formulir sesuai yang akan dilihat peserta
                </p>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Tabs — order swaps based on event status */}
        <Tabs defaultValue={defaultTab} className="flex-1 flex flex-col overflow-hidden">
          <div className="px-6 border-b bg-muted/20">
            <TabsList className="bg-transparent h-auto p-0 gap-6">
              {isActive ? (
                // Active: Post-Event first
                <>
                  <TabsTrigger
                    value="post-event"
                    className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3 pt-3 px-0 text-sm font-medium transition-all"
                    disabled={!postSurveyEnabled}
                  >
                    <MessageSquare size={14} className="mr-2" />
                    Survei Post-Event
                    {!postSurveyEnabled && (
                      <Badge variant="secondary" className="ml-2 text-[10px]">Nonaktif</Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger
                    value="registration"
                    className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3 pt-3 px-0 text-sm font-medium transition-all"
                  >
                    <ClipboardCheck size={14} className="mr-2" />
                    Formulir Registrasi
                  </TabsTrigger>
                </>
              ) : (
                // Draft: Registration first
                <>
                  <TabsTrigger
                    value="registration"
                    className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3 pt-3 px-0 text-sm font-medium transition-all"
                  >
                    <ClipboardCheck size={14} className="mr-2" />
                    Formulir Registrasi
                  </TabsTrigger>
                  <TabsTrigger
                    value="post-event"
                    className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3 pt-3 px-0 text-sm font-medium transition-all"
                    disabled={!postSurveyEnabled}
                  >
                    <MessageSquare size={14} className="mr-2" />
                    Survei Post-Event
                    {!postSurveyEnabled && (
                      <Badge variant="secondary" className="ml-2 text-[10px]">Nonaktif</Badge>
                    )}
                  </TabsTrigger>
                </>
              )}
            </TabsList>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 bg-background/50">
            <TabsContent value="registration" className="m-0 focus-visible:outline-none">
              <SurveyPreview
                fields={registrationFields}
                title="Formulir Pendaftaran Event"
                description="Lengkapi data diri Anda untuk mendaftar event ini."
                fixedFields={FIXED_REGISTRATION_FIELDS}
                submitLabel="Daftar Sekarang"
              />
            </TabsContent>

            <TabsContent value="post-event" className="m-0 focus-visible:outline-none">
              {!postSurveyEnabled ? (
                <div className="max-w-2xl mx-auto">
                  <Card className="border border-dashed">
                    <CardContent className="pt-10 pb-12 text-center space-y-4">
                      <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                        <X size={28} />
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-semibold">Survei Belum Diaktifkan</h4>
                        <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                          Aktifkan survei post-event di Survey Builder untuk melihat preview di sini.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <SurveyPreview
                  fields={postEventFields}
                  title="Survei Kepuasan Peserta"
                  description="Bantu kami meningkatkan kualitas event dengan mengisi survei berikut."
                  submitLabel="Kirim Jawaban"
                />
              )}
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
