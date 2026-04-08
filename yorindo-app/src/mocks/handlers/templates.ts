import { http, HttpResponse, delay } from 'msw'
import { faker } from '@faker-js/faker'

interface Template {
  id: string
  name: string
  type: 'invitation' | 'confirmation' | 'rejection' | 'ticket_delivery' | 'cancellation' | 'reminder'
  channel: 'email' | 'whatsapp'
  subject?: string
  body: string
  logoUrl?: string
  imageType?: 'header' | 'background'
  bgOpacity?: number
  createdAt: string
}

// All 10 templates: 5 types × 2 channels
let templatesStore: Template[] = [
  // ── Invitation ──
  {
    id: 'tmpl-001', name: 'Undangan Event (WhatsApp)', type: 'invitation', channel: 'whatsapp',
    body: 'Halo {{name}}, Anda diundang ke {{event_title}} pada {{date}} di {{venue}}.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'tmpl-002', name: 'Undangan Event (Email)', type: 'invitation', channel: 'email',
    subject: 'Undangan: {{event_title}}',
    body: '<p>Halo {{name}},</p><p>Anda diundang ke <strong>{{event_title}}</strong> pada {{date}} di {{venue}}.</p>',
    createdAt: new Date().toISOString(),
  },

  // ── Confirmation ──
  {
    id: 'tmpl-003', name: 'Konfirmasi Tiket (WhatsApp)', type: 'confirmation', channel: 'whatsapp',
    body: 'Selamat {{name}}! Registrasi Anda untuk {{event_title}} telah disetujui.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'tmpl-004', name: 'Konfirmasi Tiket (Email)', type: 'confirmation', channel: 'email',
    subject: 'Konfirmasi Registrasi - {{event_title}}',
    body: '<p>Selamat {{name}}!</p><p>Registrasi Anda untuk <strong>{{event_title}}</strong> telah disetujui.</p>',
    createdAt: new Date().toISOString(),
  },

  // ── Rejection ──
  {
    id: 'tmpl-005', name: 'Penolakan (WhatsApp)', type: 'rejection', channel: 'whatsapp',
    body: 'Maaf {{name}}, registrasi Anda untuk {{event_title}} tidak dapat kami terima.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'tmpl-006', name: 'Penolakan (Email)', type: 'rejection', channel: 'email',
    subject: 'Status Registrasi - {{event_title}}',
    body: '<p>Maaf {{name}},</p><p>Registrasi Anda untuk <strong>{{event_title}}</strong> tidak dapat kami terima.</p>',
    createdAt: new Date().toISOString(),
  },

  // ── Ticket Delivery ──
  {
    id: 'tmpl-007', name: 'Pengiriman Tiket (WhatsApp)', type: 'ticket_delivery', channel: 'whatsapp',
    body: 'Berikut tiket Anda untuk {{event_title}}. Token: {{token}}',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'tmpl-008', name: 'Pengiriman Tiket (Email)', type: 'ticket_delivery', channel: 'email',
    subject: 'Tiket Anda - {{event_title}}',
    body: '<p>Berikut tiket Anda untuk <strong>{{event_title}}</strong>.</p><p>Token: {{token}}</p>',
    createdAt: new Date().toISOString(),
  },

  // ── Cancellation ──
  {
    id: 'tmpl-009', name: 'Pembatalan Event (WhatsApp)', type: 'cancellation', channel: 'whatsapp',
    body: 'Maaf {{name}}, event {{event_title}} pada {{date}} dibatalkan.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'tmpl-010', name: 'Pembatalan Event (Email)', type: 'cancellation', channel: 'email',
    subject: 'Event Dibatalkan - {{event_title}}',
    body: '<p>Maaf {{name}},</p><p>Event <strong>{{event_title}}</strong> pada {{date}} telah dibatalkan.</p>',
    createdAt: new Date().toISOString(),
  },

  // ── Reminder ──
  {
    id: 'tmpl-011', name: 'Pengingat Event (WhatsApp)', type: 'reminder', channel: 'whatsapp',
    body: 'Halo {{name}}, event {{event_title}} tinggal {{days}} hari lagi! Jangan lupa untuk hadir.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'tmpl-012', name: 'Pengingat Event (Email)', type: 'reminder', channel: 'email',
    subject: 'Pengingat: {{event_title}}',
    body: '<p>Halo {{name}},</p><p>Ini adalah pengingat untuk event <strong>{{event_title}}</strong> pada {{date}} di {{venue}}.</p>',
    createdAt: new Date().toISOString(),
  },
]

export const templateHandlers = [
  http.get('/api/templates', async () => {
    await delay(300)
    return HttpResponse.json(templatesStore)
  }),

  http.post('/api/templates', async ({ request }) => {
    await delay(500)
    const body = await request.json() as Partial<Template>
    const newTemplate: Template = {
      id: `tmpl-${faker.string.alphanumeric(6)}`,
      name: body.name ?? 'Unnamed',
      type: body.type ?? 'invitation',
      channel: body.channel ?? 'email',
      subject: body.subject,
      body: body.body ?? '',
      logoUrl: body.logoUrl,
      imageType: body.imageType,
      bgOpacity: body.bgOpacity,
      createdAt: new Date().toISOString(),
    }
    templatesStore.push(newTemplate)
    return HttpResponse.json(newTemplate, { status: 201 })
  }),

  http.put('/api/templates/:id', async ({ params, request }) => {
    await delay(400)
    const body = await request.json() as Partial<Template>
    const idx = templatesStore.findIndex((t) => t.id === params.id)
    if (idx === -1) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Template not found', details: [] } },
        { status: 404 }
      )
    }
    templatesStore[idx] = {
      ...templatesStore[idx],
      ...body,
      subject: body.subject ?? templatesStore[idx].subject,
      logoUrl: body.logoUrl ?? templatesStore[idx].logoUrl,
      imageType: body.imageType ?? templatesStore[idx].imageType,
      bgOpacity: body.bgOpacity ?? templatesStore[idx].bgOpacity,
    }
    return HttpResponse.json(templatesStore[idx])
  }),

  http.delete('/api/templates/:id', async ({ params }) => {
    await delay(300)
    templatesStore = templatesStore.filter((t) => t.id !== params.id)
    return new HttpResponse(null, { status: 204 })
  }),
]