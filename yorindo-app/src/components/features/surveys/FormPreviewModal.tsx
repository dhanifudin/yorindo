import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/card' // Wait, I should use @/components/ui/dialog
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import Form from '@rjsf/core'
import validator from '@rjsf/validator-ajv8'
import { SurveyField } from '@/types/surveys'
import { buildSurveySchema } from './surveySchemaBuilder'
import { surveyCustomWidgets } from './widgets'
import { Button } from '@/components/ui/button'
import { X, ClipboardCheck, MessageSquare } from 'lucide-react'

// I'll import Dialog from the correct path
import { Dialog as ShadcnDialog, DialogContent as ShadcnDialogContent, DialogHeader as ShadcnDialogHeader, DialogTitle as ShadcnDialogTitle } from '@/components/ui/dialog'

interface FormPreviewModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  registrationFields: SurveyField[]
  postEventFields: SurveyField[]
  postSurveyEnabled: boolean
}

// Fixed fields for registration form
const FIXED_REGISTRATION_PROPERTIES = {
  name: { type: 'string', title: 'Nama Lengkap' },
  email: { type: 'string', title: 'Email' },
  phone: { type: 'string', title: 'Nomor Telepon' },
  company_name: { type: 'string', title: 'Nama Perusahaan' },
  position: { type: 'string', title: 'Jabatan' },
  industry_type: { type: 'string', title: 'Industri' },
}

const FIXED_REGISTRATION_UI = {
  'ui:order': ['name', 'email', 'phone', 'company_name', 'position', 'industry_type'],
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
  const mergedRegSchema = {
    type: 'object',
    properties: {
      ...FIXED_REGISTRATION_PROPERTIES,
      ...regSurvey.schema.properties,
    },
    required: ['name', 'email', 'phone', ...(regSurvey.schema.required || [])],
  }

  const mergedRegUiSchema = {
    ...regSurvey.uiSchema,
    'ui:order': [
      ...FIXED_REGISTRATION_UI['ui:order'],
      ...(regSurvey.uiSchema['ui:order'] as string[] || []),
    ],
  }

  return (
    <ShadcnDialog open={open} onOpenChange={onOpenChange}>
      <ShadcnDialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0 border-none shadow-2xl">
        <ShadcnDialogHeader className="p-6 bg-violet-600 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Eye className="text-white" size={20} />
            </div>
            <div>
              <ShadcnDialogTitle className="text-xl font-bold text-white">Preview Formulir</ShadcnDialogTitle>
              <p className="text-sm text-violet-100">Lihat tampilan survei Anda dari perspektif peserta</p>
            </div>
          </div>
        </ShadcnDialogHeader>

        <Tabs defaultValue="registration" className="flex-1 flex flex-col overflow-hidden">
          <div className="px-6 border-b bg-violet-50/30">
            <TabsList className="bg-transparent h-12 gap-6">
              <TabsTrigger 
                value="registration" 
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-violet-600 rounded-none h-full px-1 text-sm font-medium"
              >
                <ClipboardCheck size={16} className="mr-2" />
                Formulir Registrasi
              </TabsTrigger>
              <TabsTrigger 
                value="post-event" 
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-violet-600 rounded-none h-full px-1 text-sm font-medium"
              >
                <MessageSquare size={16} className="mr-2" />
                Survei Post-Event
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
            <TabsContent value="registration" className="m-0 focus-visible:outline-none">
              <div className="max-w-xl mx-auto bg-white rounded-2xl shadow-sm border p-8 space-y-6">
                <div className="space-y-1 pb-4 border-b">
                  <h4 className="text-lg font-bold">Pendaftaran Event</h4>
                  <p className="text-sm text-muted-foreground">Silakan isi formulir di bawah ini untuk mendaftar.</p>
                </div>
                <Form
                  schema={mergedRegSchema as any}
                  uiSchema={mergedRegUiSchema}
                  validator={validator}
                  widgets={surveyCustomWidgets}
                  disabled={true} // Read-only preview
                >
                  <Button type="button" className="w-full h-11 pointer-events-none mt-6 bg-violet-600 text-white rounded-xl">
                    Daftar Sekarang
                  </Button>
                </Form>
              </div>
            </TabsContent>

            <TabsContent value="post-event" className="m-0 focus-visible:outline-none">
              <div className="max-w-xl mx-auto">
                {!postSurveyEnabled ? (
                  <div className="text-center py-20 space-y-4 bg-white rounded-2xl border border-dashed border-slate-200">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto text-muted-foreground">
                      <X size={32} />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-bold">Survei Belum Aktif</h4>
                      <p className="text-sm text-muted-foreground max-w-xs mx-auto">Aktifkan survei post-event di tab builder untuk melihat preview di sini.</p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl shadow-sm border p-8 space-y-6">
                    <div className="space-y-1 pb-4 border-b">
                      <h4 className="text-lg font-bold">Umpan Balik Event</h4>
                      <p className="text-sm text-muted-foreground">Bagikan kesan Anda tentang event yang baru saja berakhir.</p>
                    </div>
                    <Form
                      schema={postSurvey.schema as any}
                      uiSchema={postSurvey.uiSchema}
                      validator={validator}
                      widgets={surveyCustomWidgets}
                      disabled={true}
                    >
                      <Button type="button" className="w-full h-11 pointer-events-none mt-6 bg-violet-600 text-white rounded-xl">
                        Kirim Jawaban
                      </Button>
                    </Form>
                  </div>
                )}
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </ShadcnDialogContent>
    </ShadcnDialog>
  )
}

function Eye(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}
