'use client'

import { useState } from 'react'
import { useTemplates, useDeleteTemplate, type Template } from '@/hooks/useTemplates'
import { TemplateForm } from '@/components/features/templates/TemplateForm'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const CHANNEL_BADGE: Record<string, string> = {
  email: 'bg-blue-100 text-blue-700',
  whatsapp: 'bg-green-100 text-green-700',
}

const TYPE_BADGE: Record<string, string> = {
  invitation: 'bg-purple-100 text-purple-700',
  confirmation: 'bg-teal-100 text-teal-700',
  rejection: 'bg-destructive/10 text-destructive',
  cancellation: 'bg-muted text-muted-foreground',
}

export default function TemplatesPage() {
  const [mode, setMode] = useState<'list' | 'create' | 'edit'>('list')
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)
  const [detailTemplate, setDetailTemplate] = useState<Template | null>(null)
  const { data: templates, isLoading } = useTemplates()
  const { mutate: deleteTemplate } = useDeleteTemplate()

  const handleEdit = (template: Template) => {
    setEditingTemplate(template)
    setMode('edit')
  }

  const handleClose = () => {
    setMode('list')
    setEditingTemplate(null)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Template Notifikasi</h1>
        {mode === 'list' && (
          <Button onClick={() => setMode('create')}>+ Template Baru</Button>
        )}
      </div>

      {(mode === 'create' || mode === 'edit') && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <h2 className="text-lg font-semibold mb-4">
              {mode === 'edit' ? 'Edit Template' : 'Buat Template Baru'}
            </h2>
            <TemplateForm
              template={editingTemplate ?? undefined}
              onSuccess={handleClose}
              onCancel={handleClose}
            />
          </CardContent>
        </Card>
      )}

      {/* Template detail sheet (mobile) */}
      <Sheet open={!!detailTemplate} onOpenChange={(v) => !v && setDetailTemplate(null)}>
        <SheetContent side="bottom" className="flex flex-col max-h-[60vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{detailTemplate?.name}</SheetTitle>
          </SheetHeader>
          <div className="flex-1 px-4 space-y-3 overflow-y-auto text-sm">
            <div>
              <span className="text-muted-foreground">Channel: </span>
              {detailTemplate && (
                <Badge className={CHANNEL_BADGE[detailTemplate.channel] ?? 'bg-muted text-muted-foreground'}>
                  {detailTemplate.channel}
                </Badge>
              )}
            </div>
            <div>
              <span className="text-muted-foreground">Tipe: </span>
              {detailTemplate && (
                <Badge className={TYPE_BADGE[detailTemplate.type] ?? 'bg-muted text-muted-foreground'}>
                  {detailTemplate.type}
                </Badge>
              )}
            </div>
            <div>
              <span className="text-muted-foreground block mb-1">Isi Template:</span>
              <p className="text-foreground whitespace-pre-wrap text-xs bg-muted rounded p-2">{detailTemplate?.body}</p>
            </div>
          </div>
          <SheetFooter className="flex-row">
            <Button size="sm" variant="outline" onClick={() => { if (detailTemplate) { handleEdit(detailTemplate) } setDetailTemplate(null) }}>
              Edit
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={() => { if (detailTemplate) deleteTemplate(detailTemplate.id); setDetailTemplate(null) }}
            >
              Hapus
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {templates?.map((tmpl) => (
              <div
                key={tmpl.id}
                className="rounded-lg border border-border bg-card p-3 cursor-pointer active:bg-muted/50"
                onClick={() => setDetailTemplate(tmpl)}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{tmpl.name}</span>
                  <Badge className={TYPE_BADGE[tmpl.type] ?? 'bg-muted text-muted-foreground'}>
                    {tmpl.type}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={CHANNEL_BADGE[tmpl.channel] ?? 'bg-muted text-muted-foreground'} >
                    {tmpl.channel}
                  </Badge>
                  <span className="text-xs text-muted-foreground truncate">{tmpl.body?.slice(0, 50)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <Card className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Tipe</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Isi (Preview)</TableHead>
                  <TableHead>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates?.map((tmpl) => (
                  <TableRow key={tmpl.id} className="cursor-pointer" onClick={() => setDetailTemplate(tmpl)}>
                    <TableCell className="font-medium" onClick={(e) => e.stopPropagation()}>{tmpl.name}</TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Badge className={TYPE_BADGE[tmpl.type] ?? 'bg-muted text-muted-foreground'}>
                        {tmpl.type}
                      </Badge>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Badge className={CHANNEL_BADGE[tmpl.channel] ?? 'bg-muted text-muted-foreground'}>
                        {tmpl.channel}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-xs truncate" onClick={(e) => e.stopPropagation()}>
                      {tmpl.body}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(tmpl)}>
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => deleteTemplate(tmpl.id)}
                        >
                          Hapus
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </>
      )}
    </div>
  )
}
