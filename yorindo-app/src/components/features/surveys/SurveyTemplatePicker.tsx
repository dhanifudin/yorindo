'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FileText, Copy, Loader2 } from 'lucide-react'

interface Template {
  id: string
  name: string
  description: string | null
  survey_type: 'registration' | 'post-event'
  schema: Record<string, unknown>
  ui_schema: Record<string, unknown>
  is_builtin: boolean
}

interface Event {
  id: string
  name: string
  status: string
}

interface SurveyTemplatePickerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  surveyType: 'registration' | 'post-event'
  currentEventId: string
  onSelectTemplate: (schema: Record<string, unknown>, uiSchema: Record<string, unknown>) => void
  onSelectFromEvent: (sourceEventId: string) => void
}

export function SurveyTemplatePicker({
  open,
  onOpenChange,
  surveyType,
  currentEventId,
  onSelectTemplate,
  onSelectFromEvent,
}: SurveyTemplatePickerProps) {
  const [activeTab, setActiveTab] = useState<'templates' | 'events'>('templates')
  const [copyingEventId, setCopyingEventId] = useState<string | null>(null)

  // Fetch templates
  const { data: templates, isLoading: templatesLoading } = useQuery<Template[]>({
    queryKey: ['survey-templates', surveyType],
    queryFn: () => fetch(`/api/surveys/templates?type=${surveyType}`).then((r) => r.json()).then((d) => d.data),
    enabled: open,
    staleTime: 5 * 60 * 1000,
  })

  // Fetch past events with surveys
  const { data: events, isLoading: eventsLoading } = useQuery<Event[]>({
    queryKey: ['events-with-surveys', surveyType],
    queryFn: () => fetch(`/api/events?hasSurvey=${surveyType}`).then((r) => r.json()).then((d) => d.data),
    enabled: open && activeTab === 'events',
    staleTime: 5 * 60 * 1000,
  })

  const handleCopyFromEvent = async (eventId: string) => {
    setCopyingEventId(eventId)
    try {
      onSelectFromEvent(eventId)
    } finally {
      setCopyingEventId(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gunakan Desain yang Ada</DialogTitle>
          <DialogDescription>
            Pilih template atau salin dari event sebelumnya
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'templates' | 'events')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="templates">Template</TabsTrigger>
            <TabsTrigger value="events">Dari Event Lain</TabsTrigger>
          </TabsList>

          <TabsContent value="templates" className="space-y-3 mt-4">
            {templatesLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : templates?.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Belum ada template untuk survei ini.
              </p>
            ) : (
              templates?.map((tpl) => (
                <Card key={tpl.id} className="hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => onSelectTemplate(tpl.schema, tpl.ui_schema)}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <CardTitle className="text-base">{tpl.name}</CardTitle>
                      </div>
                      {tpl.is_builtin && (
                        <Badge variant="secondary" className="text-xs">Bawaan</Badge>
                      )}
                    </div>
                    {tpl.description && (
                      <CardDescription>{tpl.description}</CardDescription>
                    )}
                  </CardHeader>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="events" className="space-y-3 mt-4">
            {eventsLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : events?.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Belum ada event lain dengan survei ini.
              </p>
            ) : (
              events?.map((evt) => (
                <div key={evt.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                  <div>
                    <p className="font-medium text-sm">{evt.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{evt.status}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCopyFromEvent(evt.id)}
                    disabled={evt.id === currentEventId || copyingEventId === evt.id}
                  >
                    {copyingEventId === evt.id ? (
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    ) : (
                      <Copy className="w-4 h-4 mr-1" />
                    )}
                    Salin
                  </Button>
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
