import React from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import Form from '@rjsf/shadcn'
import '@rjsf/shadcn/dist/clean-slate.css'
import validator from '@rjsf/validator-ajv8'
import type { RJSFSchema } from '@rjsf/utils'
import { SurveyField } from '@/types/surveys'
import { buildSurveySchema } from './surveySchemaBuilder'
import { surveyCustomWidgets } from './widgets'
import { Button } from '@/components/ui/button'
import { X, Eye, ClipboardCheck, MessageSquare } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'
import { Theme as ShadcnTheme } from '@rjsf/shadcn'

interface FormPreviewModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  registrationFields: SurveyField[]
  postEventFields: SurveyField[]
  postSurveyEnabled: boolean
}

export function FormPreviewModal({
  open,
  onOpenChange,
  registrationFields,
  postEventFields,
  postSurveyEnabled,
}: FormPreviewModalProps) {
  // Build schemas
  const regSurvey = buildSurveySchema(registrationFields)
  const postSurvey = buildSurveySchema(postEventFields)

  // Merge registration fixed fields with survey fields
  const FIXED_REGISTRATION_PROPERTIES: Record<string, RJSFSchema> = {
    name: { type: 'string', title: 'Nama Lengkap' },
    email: { type: 'string', title: 'Email' },
    phone: { type: 'string', title: 'Nomor Telepon' },
    company_name: { type: 'string', title: 'Nama Perusahaan' },
    position: { type: 'string', title: 'Jabatan' },
    industry_type: { type: 'string', title: 'Industri' },
  }

  const FIXED_REGISTRATION_ORDER = ['name', 'email', 'phone', 'company_name', 'position', 'industry_type']

  const mergedRegSchema: RJSFSchema = {
    type: 'object',
    properties: {
      ...FIXED_REGISTRATION_PROPERTIES,
      ...(regSurvey.schema.properties as Record<string, RJSFSchema>),
    },
    required: ['name', 'email', 'phone', ...((regSurvey.schema.required as string[]) || [])],
  }

  const mergedRegUiSchema = {
    ...regSurvey.uiSchema,
    'ui:order': [
      ...FIXED_REGISTRATION_ORDER,
      ...((regSurvey.uiSchema['ui:order'] as string[]) || []),
    ],
  }

  // Merge custom widgets with shadcn theme widgets
  const customWidgets = {
    ...ShadcnTheme.widgets,
    ...surveyCustomWidgets,
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] sm:max-w-5xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Eye className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="uppercase text-xs tracking-[2px] text-muted-foreground font-medium">
                PREVIEW FORMULIR
              </p>
              <DialogTitle className="text-2xl mt-0.5">Preview Formulir</DialogTitle>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="registration" className="flex-1 flex flex-col overflow-hidden">
          <div className="px-6 border-b bg-muted/30">
            <TabsList className="bg-transparent h-auto p-0 gap-6">
              <TabsTrigger
                value="registration"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3 pt-0 px-0 text-sm font-semibold transition-all relative overflow-visible"
              >
                <ClipboardCheck size={16} className="mr-2" />
                Formulir Registrasi
              </TabsTrigger>
              <TabsTrigger
                value="post-event"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3 pt-0 px-0 text-sm font-semibold transition-all relative overflow-visible"
              >
                <MessageSquare size={16} className="mr-2" />
                Survei Post-Event
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto p-6 bg-background">
            <TabsContent value="registration" className="m-0 focus-visible:outline-none">
              <Card className="border border-border shadow-sm overflow-hidden">
                <CardContent className="pt-10 pb-12">
                  {registrationFields.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground space-y-2">
                      <p className="text-sm font-medium">Formulir Registrasi</p>
                      <p className="text-sm">Berisi field wajib: Nama Lengkap, Email, Nomor Telepon, Nama Perusahaan, Jabatan, dan Industri.</p>
                      <p className="text-xs">Tambahkan pertanyaan survei untuk melihat preview lengkap di sini.</p>
                    </div>
                  ) : (
                    <div className="max-w-3xl mx-auto">
                      <Form
                        schema={mergedRegSchema}
                        uiSchema={mergedRegUiSchema}
                        validator={validator}
                        widgets={customWidgets}
                        templates={ShadcnTheme.templates}
                        disabled={true}
                        formContext={{ isPreview: true }}
                      >
                        <Button type="button" className="w-full h-11 pointer-events-none mt-8 bg-primary text-primary-foreground rounded-md" disabled>
                          Daftar Sekarang
                        </Button>
                      </Form>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="post-event" className="m-0 focus-visible:outline-none">
              <div className="max-w-3xl mx-auto">
                {!postSurveyEnabled ? (
                  <Card className="border border-dashed border-muted-foreground/25">
                    <CardContent className="pt-10 pb-12 text-center space-y-4">
                      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                        <X size={32} />
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-semibold text-lg">Survei Belum Diaktifkan</h4>
                        <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                          Aktifkan survei post-event di tab builder untuk melihat preview di sini.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="border border-border shadow-sm overflow-hidden">
                    <CardContent className="pt-10 pb-12">
                      {postEventFields.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                          <p className="text-sm">Belum ada pertanyaan survei ditambahkan.</p>
                        </div>
                      ) : (
                        <Form
                          schema={postSurvey.schema as RJSFSchema}
                          uiSchema={postSurvey.uiSchema}
                          validator={validator}
                          widgets={customWidgets}
                          templates={ShadcnTheme.templates}
                          disabled={true}
                          formContext={{ isPreview: true }}
                        >
                          <Button type="button" className="w-full h-11 pointer-events-none mt-8 bg-primary text-primary-foreground rounded-md" disabled>
                            Kirim Jawaban
                          </Button>
                        </Form>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
