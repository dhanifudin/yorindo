import { http, HttpResponse, delay } from 'msw'
import { faker } from '@faker-js/faker'

interface Template {
  id: string
  name: string
  type: 'invitation' | 'confirmation' | 'rejection' | 'cancellation'
  channel: 'email' | 'whatsapp'
  body: string
  createdAt: string
}

let templatesStore: Template[] = [
  {
    id: 'tmpl-001',
    name: 'Undangan Event',
    type: 'invitation',
    channel: 'whatsapp',
    body: 'Halo {{name}}, Anda diundang ke {{event_title}} pada {{date}} di {{venue}}.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'tmpl-002',
    name: 'Konfirmasi Tiket',
    type: 'confirmation',
    channel: 'email',
    body: 'Selamat {{name}}! Registrasi Anda untuk {{event_title}} telah disetujui.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'tmpl-003',
    name: 'Penolakan',
    type: 'rejection',
    channel: 'email',
    body: 'Maaf {{name}}, registrasi Anda untuk {{event_title}} tidak dapat kami terima saat ini.',
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
      body: body.body ?? '',
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
    templatesStore[idx] = { ...templatesStore[idx], ...body }
    return HttpResponse.json(templatesStore[idx])
  }),

  http.delete('/api/templates/:id', async ({ params }) => {
    await delay(300)
    templatesStore = templatesStore.filter((t) => t.id !== params.id)
    return new HttpResponse(null, { status: 204 })
  }),
]
