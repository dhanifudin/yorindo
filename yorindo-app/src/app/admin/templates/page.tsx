'use client'

import { useState } from 'react'
import { useTemplates, useDeleteTemplate, type Template } from '@/hooks/useTemplates'
import { TemplateForm } from '@/components/features/templates/TemplateForm'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
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

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        <Card>
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
                <TableRow key={tmpl.id}>
                  <TableCell className="font-medium">{tmpl.name}</TableCell>
                  <TableCell>
                    <Badge className={TYPE_BADGE[tmpl.type] ?? 'bg-muted text-muted-foreground'}>
                      {tmpl.type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={CHANNEL_BADGE[tmpl.channel] ?? 'bg-muted text-muted-foreground'}>
                      {tmpl.channel}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-xs truncate">
                    {tmpl.body}
                  </TableCell>
                  <TableCell>
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
      )}
    </div>
  )
}
