'use client'

import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SurveyBuilderTab } from '@/components/features/surveys/SurveyBuilderTab'
import { FormPreviewModal } from '@/components/features/surveys/FormPreviewModal'
import { SurveyField } from '@/types/surveys'
import { useSurveySchema } from '@/hooks/useSurveys'
import { schemaToFields } from '@/components/features/surveys/surveySchemaBuilder'
import { Event } from '@/types/api'
import { Button } from '@/components/ui/button'
import { ArrowLeft, LayoutDashboard, Settings2, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

interface SurveyBuilderClientProps {
  id: string
}

export default function SurveyBuilderClient({ id }: SurveyBuilderClientProps) {
  const queryClient = useQueryClient()
  const [previewOpen, setPreviewOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'registration' | 'post-event'>('registration')
  
  // Registration and Post-Event preview fields
  const [regPreviewFields, setRegPreviewFields] = useState<SurveyField[]>([])
  const [postPreviewFields, setPostPreviewFields] = useState<SurveyField[]>([])

  const { data: event } = useQuery<Event>({
    queryKey: ['events', id],
    queryFn: () => fetch(`/api/events/${id}`).then((r) => r.json()),
  })

  // Separate query for each survey type to keep logic clean
  const { data: regSchema } = useSurveySchema(id, 'registration')
  const { data: postSchema } = useSurveySchema(id, 'post-event')

  const togglePostSurveyMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const res = await fetch(`/api/events/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postSurveyEnabled: enabled }),
      })
      if (!res.ok) throw new Error('Gagal mengubah status survei')
      return res.json()
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(['events', id], updated)
      toast.success(`Survei Post-Event ${updated.postSurveyEnabled ? 'diaktifkan' : 'dinonaktifkan'}`)
    }
  })

  const handlePreview = (fields: SurveyField[]) => {
    // Current tab's fields gathered from child
    if (activeTab === 'registration') {
      setRegPreviewFields(fields)
      // Sync post-event if already loaded
      if (postSchema) {
        setPostPreviewFields(schemaToFields(postSchema.schema, postSchema.uiSchema))
      }
    } else {
      setPostPreviewFields(fields)
      // Sync registration if already loaded
      if (regSchema) {
        setRegPreviewFields(schemaToFields(regSchema.schema, regSchema.uiSchema))
      }
    }
    setPreviewOpen(true)
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Link 
              href={`/app/events/${id}`} 
              className="hover:text-primary transition-colors flex items-center gap-1 text-sm font-medium"
            >
              <ArrowLeft size={14} />
              Kembali ke Detail Event
            </Link>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            Survey Builder 
            <Sparkles className="text-violet-500 fill-violet-500/20" size={24} />
          </h1>
          <p className="text-slate-500 text-sm">
            Rancang kuesioner Anda untuk registrasi dan umpan balik peserta.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" asChild className="border-slate-200">
            <Link href={`/app/events/${id}/survey-responses`}>
              <LayoutDashboard size={16} className="mr-2" />
              Lihat Dashboard Respons
            </Link>
          </Button>
        </div>
      </div>

      <Tabs 
        value={activeTab} 
        onValueChange={(val) => setActiveTab(val as 'registration' | 'post-event')}
        className="space-y-6"
      >
        <div className="flex items-center justify-between border-b pb-1">
          <TabsList className="bg-transparent h-auto p-0 gap-8">
            <TabsTrigger 
              value="registration" 
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-violet-600 rounded-none pb-3 pt-0 px-0 text-sm font-semibold transition-all relative overflow-visible"
            >
              Survei Registrasi
              {activeTab === 'registration' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-600" />
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="post-event" 
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-violet-600 rounded-none pb-3 pt-0 px-0 text-sm font-semibold transition-all relative overflow-visible"
            >
              Survei Post-Event
              {activeTab === 'post-event' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-600" />
              )}
              {event?.postSurveyEnabled && (
                <span className="ml-2 w-2 h-2 rounded-full bg-green-500" />
              )}
            </TabsTrigger>
          </TabsList>
          
          <Button variant="ghost" size="sm" className="hidden sm:flex text-slate-500 hover:bg-slate-100">
             <Settings2 size={14} className="mr-1.5" />
             Pengaturan Survey
          </Button>
        </div>

        <TabsContent value="registration" className="m-0 focus-visible:outline-none">
          <SurveyBuilderTab 
            eventId={id} 
            type="registration" 
            onPreview={handlePreview}
          />
        </TabsContent>

        <TabsContent value="post-event" className="m-0 focus-visible:outline-none">
          <SurveyBuilderTab 
            eventId={id} 
            type="post-event" 
            postSurveyEnabled={event?.postSurveyEnabled}
            onTogglePostSurvey={(enabled) => togglePostSurveyMutation.mutate(enabled)}
            onPreview={handlePreview}
          />
        </TabsContent>
      </Tabs>

      <FormPreviewModal 
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        registrationFields={regPreviewFields}
        postEventFields={postPreviewFields}
        postSurveyEnabled={event?.postSurveyEnabled || false}
      />
    </div>
  )
}
