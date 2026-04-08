export type TemplateType = 'invitation' | 'confirmation' | 'rejection' | 'cancellation'
export type TemplateChannel = 'email' | 'whatsapp'

export interface BlastTemplate {
  id: string
  name: string
  type: TemplateType
  channel: TemplateChannel
  body: string
  createdAt: string
}

const seededAt = '2026-03-20T09:00:00.000Z'

export const seededTemplates: BlastTemplate[] = [
  {
    id: 'tmpl-001',
    name: 'Undangan Event (WhatsApp)',
    type: 'invitation',
    channel: 'whatsapp',
    body: 'Halo {{name}}, Anda diundang ke {{event_title}} pada {{date}} di {{venue}}.',
    createdAt: seededAt,
  },
  {
    id: 'tmpl-002',
    name: 'Undangan Event (Email)',
    type: 'invitation',
    channel: 'email',
    body: '<p>Halo {{name}},</p><p>Anda diundang ke <strong>{{event_title}}</strong> pada {{date}} di {{venue}}.</p>',
    createdAt: seededAt,
  },
  {
    id: 'tmpl-003',
    name: 'Konfirmasi Tiket',
    type: 'confirmation',
    channel: 'email',
    body: 'Selamat {{name}}! Registrasi Anda untuk {{event_title}} telah disetujui.',
    createdAt: seededAt,
  },
  {
    id: 'tmpl-004',
    name: 'Penolakan',
    type: 'rejection',
    channel: 'email',
    body: 'Maaf {{name}}, registrasi Anda untuk {{event_title}} tidak dapat kami terima saat ini.',
    createdAt: seededAt,
  },
]

export function listTemplates(): BlastTemplate[] {
  return seededTemplates.map((template) => ({ ...template }))
}

export function findTemplateById(id: string): BlastTemplate | null {
  const found = seededTemplates.find((template) => template.id === id)
  return found ? { ...found } : null
}
