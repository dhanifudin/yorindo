'use client'

import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { SurveyBuilderTab } from '@/components/features/surveys/SurveyBuilderTab'
import { FormPreviewModal } from '@/components/features/surveys/FormPreviewModal'
import { SurveyField } from '@/types/surveys'
import { useSurveySchema } from '@/hooks/useSurveys'
import { schemaToFields } from '@/components/features/surveys/surveySchemaBuilder'
import { Event } from '@/types/api'
import { Button } from '@/components/ui/button'
import { ArrowLeft, LayoutDashboard } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface SurveyBuilderClientProps {
  id: string
}

export default function SurveyBuilderClient({ id }: SurveyBuilderClientProps) {
  const queryClient = useQueryClient()
  const [previewOpen, setPreviewOpen] = useState(false)

  // Active events: Post-Event first. Draft: Registration first.
  const { data: event } = useQuery<Event>({
    queryKey: ['events', id],
    queryFn: () => fetch(`/api/events/${id}`).then((r) => r.json()),
  })

  const isActive = event?.status === 'active'
  const defaultTab = isActive ? 'post-event' : 'registration'
  const [activeTab, setActiveTab] = useState<'registration' | 'post-event'>(defaultTab)
  const [regPreviewFields, setRegPreviewFields] = useState<SurveyField[]>([])
  const [postPreviewFields, setPostPreviewFields] = useState<SurveyField[]>([])

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

  const isDraft = event?.status === 'draft'
  const isPreSurveyLocked = !isDraft // registration survey locked after draft

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Link
              href={`/app/events/${id}`}
              className="hover:text-foreground transition-colors flex items-center gap-1 text-sm font-medium"
            >
              <ArrowLeft size={14} />
              Kembali ke Detail Event
            </Link>
          </div>
          <h1 className="text-2xl font-bold">
            Survey Builder
          </h1>
          <p className="text-sm text-muted-foreground">
            Rancang kuesioner Anda untuk registrasi dan umpan balik peserta.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href={`/app/events/${id}/survey-responses`}>
              <LayoutDashboard size={16} className="mr-2" />
              Lihat Dashboard Respons
            </Link>
          </Button>
        </div>
      </div>

      {/* Locked banner for registration survey when event is past draft */}
      {isPreSurveyLocked && activeTab === 'registration' && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <span className="text-amber-600 text-lg">🔒</span>
            <div>
              <p className="text-sm font-medium text-amber-800">Survei Registrasi Terkunci</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Survei registrasi tidak dapat diubah setelah event dibuat. Pendaftaran peserta mungkin sudah menggunakan formulir ini.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs — order swaps based on event status */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as 'registration' | 'post-event')}
        className="space-y-6"
      >
        <nav className="flex border-b border-border bg-background overflow-x-auto">
          {isActive ? (
            // Active: Post-Event first
            <>
              <button
                onClick={() => setActiveTab('post-event')}
                className={cn(
                  'inline-flex items-center px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors',
                  activeTab === 'post-event'
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border',
                  !event?.postSurveyEnabled && 'opacity-60 pointer-events-none',
                )}
              >
                Survei Post-Event
                {event?.postSurveyEnabled && (
                  <span className="ml-2 w-2 h-2 rounded-full bg-green-500" />
                )}
              </button>
              <button
                onClick={() => !isPreSurveyLocked && setActiveTab('registration')}
                className={cn(
                  'inline-flex items-center px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors',
                  activeTab === 'registration'
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border',
                  isPreSurveyLocked && 'opacity-60 pointer-events-none cursor-not-allowed',
                )}
                disabled={isPreSurveyLocked}
                title={isPreSurveyLocked ? 'Survei registrasi tidak dapat diubah setelah event dibuat' : ''}
              >
                Survei Registrasi
                {isPreSurveyLocked && (
                  <span className="ml-2 text-xs text-muted-foreground">(terkunci)</span>
                )}
              </button>
            </>
          ) : (
            // Draft: Registration first
            <>
              <button
                onClick={() => !isPreSurveyLocked && setActiveTab('registration')}
                className={cn(
                  'inline-flex items-center px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors',
                  activeTab === 'registration'
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border',
                  isPreSurveyLocked && 'opacity-60 pointer-events-none cursor-not-allowed',
                )}
                disabled={isPreSurveyLocked}
                title={isPreSurveyLocked ? 'Survei registrasi tidak dapat diubah setelah event dibuat' : ''}
              >
                Survei Registrasi
                {isPreSurveyLocked && (
                  <span className="ml-2 text-xs text-muted-foreground">(terkunci)</span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('post-event')}
                className={cn(
                  'inline-flex items-center px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors',
                  activeTab === 'post-event'
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border',
                  !event?.postSurveyEnabled && 'opacity-60 pointer-events-none',
                )}
              >
                Survei Post-Event
                {event?.postSurveyEnabled && (
                  <span className="ml-2 w-2 h-2 rounded-full bg-green-500" />
                )}
              </button>
            </>
          )}
        </nav>

        {/* Post-Event Survey — always editable when enabled */}
        <TabsContent value="post-event" className="m-0 focus-visible:outline-none">
          <SurveyBuilderTab
            eventId={id}
            type="post-event"
            postSurveyEnabled={event?.postSurveyEnabled}
            onTogglePostSurvey={(enabled) => togglePostSurveyMutation.mutate(enabled)}
            onPreview={handlePreview}
            readOnly={!event?.postSurveyEnabled}
          />
        </TabsContent>

        {/* Registration Survey — locked after draft */}
        <TabsContent value="registration" className="m-0 focus-visible:outline-none">
          <SurveyBuilderTab
            eventId={id}
            type="registration"
            onPreview={handlePreview}
            readOnly={isPreSurveyLocked}
          />
        </TabsContent>
      </Tabs>

      <FormPreviewModal
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        registrationFields={regPreviewFields}
        postEventFields={postPreviewFields}
        postSurveyEnabled={event?.postSurveyEnabled || false}
        eventStatus={event?.status}
      />
    </div>
  )
}
