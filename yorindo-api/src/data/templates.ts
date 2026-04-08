export type TemplateType = 'invitation' | 'confirmation' | 'rejection' | 'ticket_delivery' | 'cancellation' | 'reminder'
export type TemplateChannel = 'email' | 'whatsapp'

export interface BlastTemplate {
  id: string
  name: string
  type: TemplateType
  channel: TemplateChannel
  subject?: string
  body: string
  createdAt: string
}

const seededAt = '2026-03-20T09:00:00.000Z'

// All 10 templates: 5 types × 2 channels
export const seededTemplates: BlastTemplate[] = [
  // ── Invitation ──
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
    subject: 'Undangan: {{event_title}}',
    body: '<p>Halo {{name}},</p><p>Anda diundang ke <strong>{{event_title}}</strong> pada {{date}} di {{venue}}.</p>',
    createdAt: seededAt,
  },

  // ── Confirmation ──
  {
    id: 'tmpl-003',
    name: 'Konfirmasi Tiket (WhatsApp)',
    type: 'confirmation',
    channel: 'whatsapp',
    body: 'Selamat {{name}}! Registrasi Anda untuk {{event_title}} telah disetujui.',
    createdAt: seededAt,
  },
  {
    id: 'tmpl-004',
    name: 'Konfirmasi Tiket (Email)',
    type: 'confirmation',
    channel: 'email',
    subject: 'Konfirmasi Registrasi - {{event_title}}',
    body: '<p>Selamat {{name}}!</p><p>Registrasi Anda untuk <strong>{{event_title}}</strong> telah disetujui.</p>',
    createdAt: seededAt,
  },

  // ── Rejection ──
  {
    id: 'tmpl-005',
    name: 'Penolakan (WhatsApp)',
    type: 'rejection',
    channel: 'whatsapp',
    body: 'Maaf {{name}}, registrasi Anda untuk {{event_title}} tidak dapat kami terima.',
    createdAt: seededAt,
  },
  {
    id: 'tmpl-006',
    name: 'Penolakan (Email)',
    type: 'rejection',
    channel: 'email',
    subject: 'Status Registrasi - {{event_title}}',
    body: '<p>Maaf {{name}},</p><p>Registrasi Anda untuk <strong>{{event_title}}</strong> tidak dapat kami terima.</p>',
    createdAt: seededAt,
  },

  // ── Ticket Delivery ──
  {
    id: 'tmpl-007',
    name: 'Pengiriman Tiket (WhatsApp)',
    type: 'ticket_delivery',
    channel: 'whatsapp',
    body: 'Berikut tiket Anda untuk {{event_title}}. Token: {{token}}',
    createdAt: seededAt,
  },
  {
    id: 'tmpl-008',
    name: 'Pengiriman Tiket (Email)',
    type: 'ticket_delivery',
    channel: 'email',
    subject: 'Tiket Anda - {{event_title}}',
    body: '<p>Berikut tiket Anda untuk <strong>{{event_title}}</strong>.</p><p>Token: {{token}}</p>',
    createdAt: seededAt,
  },

  // ── Cancellation ──
  {
    id: 'tmpl-009',
    name: 'Pembatalan Event (WhatsApp)',
    type: 'cancellation',
    channel: 'whatsapp',
    body: 'Maaf {{name}}, event {{event_title}} pada {{date}} dibatalkan.',
    createdAt: seededAt,
  },
  {
    id: 'tmpl-010',
    name: 'Pembatalan Event (Email)',
    type: 'cancellation',
    channel: 'email',
    subject: 'Event Dibatalkan - {{event_title}}',
    body: '<p>Maaf {{name}},</p><p>Event <strong>{{event_title}}</strong> yang dijadwalkan pada {{date}} telah dibatalkan.</p>',
    createdAt: seededAt,
  },

  // ── Reminder ──
  {
    id: 'tmpl-011',
    name: 'Pengingat Event (WhatsApp)',
    type: 'reminder',
    channel: 'whatsapp',
    body: 'Halo {{name}}, event {{event_title}} tinggal {{days}} hari lagi! Jangan lupa untuk hadir.',
    createdAt: seededAt,
  },
  {
    id: 'tmpl-012',
    name: 'Pengingat Event (Email)',
    type: 'reminder',
    channel: 'email',
    subject: 'Pengingat: {{event_title}}',
    body: '<p>Halo {{name}},</p><p>Ini adalah pengingat untuk event <strong>{{event_title}}</strong> yang akan dilaksanakan pada {{date}} di {{venue}}.</p><p>Kami menantikan kehadiran Anda.</p>',
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
