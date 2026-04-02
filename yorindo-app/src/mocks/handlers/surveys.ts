import { http, HttpResponse, delay } from 'msw'
import { makeMockCuid2 } from './id'
import { eventsStore } from './events'
import { SurveySchema, SurveyResponsesApiResponse } from '@/types/surveys'

// In-memory store for survey schemas per event
// type = 'registration' | 'post-event'
export const eventSurveysStore = new Map<string, { registration?: SurveySchema; 'post-event'?: SurveySchema }>()

// Seed some initial data for event-001
eventSurveysStore.set('event-001', {
  registration: {
    schema: {
      type: 'object',
      properties: {
        jabatan: { type: 'string', title: 'Apa jabatan Anda?' },
        industri: {
          type: 'string',
          title: 'Industri perusahaan Anda?',
          enum: ['Teknologi', 'Kesehatan', 'Manufaktur'],
        },
      },
      required: ['jabatan', 'industri'],
    },
    uiSchema: {},
  },
})

export const surveysHandlers = [
  // 1. Save registration schema
  http.put('/api/events/:id/survey/registration', async ({ params, request }) => {
    await delay(300)
    const id = params.id as string
    const body = (await request.json()) as SurveySchema
    
    const current = eventSurveysStore.get(id) ?? {}
    eventSurveysStore.set(id, { ...current, registration: body })
    
    // Also update eventsStore for consistency if needed, but the Map is our primary source
    const event = eventsStore.find(e => e.id === id)
    if (event) {
      event.registrationSurveySchema = body
    }
    
    return HttpResponse.json({ ok: true })
  }),

  // 2. Save post-event schema
  http.put('/api/events/:id/survey/post-event', async ({ params, request }) => {
    await delay(300)
    const id = params.id as string
    const body = (await request.json()) as SurveySchema
    
    const current = eventSurveysStore.get(id) ?? {}
    eventSurveysStore.set(id, { ...current, 'post-event': body })
    
    const event = eventsStore.find(e => e.id === id)
    if (event) {
      event.postSurveySchema = body
    }

    return HttpResponse.json({ ok: true })
  }),

  // 3. Export responses (Static route BEFORE dynamic :type)
  http.get('/api/events/:id/survey/responses/download', async () => {
    await delay(800)
    // Return a mock Excel blob
    const buffer = new TextEncoder().encode('mock-excel-content')
    return new HttpResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="survey-responses.xlsx"',
      },
    })
  }),

  // 4. Get aggregate + individual responses (Static route BEFORE dynamic :type)
  http.get('/api/events/:id/survey/responses', async ({ params, request }) => {
    await delay(500)
    const url = new URL(request.url)
    const type = url.searchParams.get('type') ?? 'registration'
    const eventId = params.id as string

    // Mock aggregate data
    const aggregates = [
      {
        questionId: 'q1',
        questionLabel: 'Bagaimana penilaian Anda terhadap event ini?',
        fieldType: 'radio' as const,
        optionCounts: [
          { label: 'Sangat Puas', count: 45, percentage: 45 },
          { label: 'Puas', count: 35, percentage: 35 },
          { label: 'Cukup', count: 15, percentage: 15 },
          { label: 'Kurang', count: 5, percentage: 5 },
        ],
      },
      {
        questionId: 'q2',
        questionLabel: 'Apa topik yang paling menarik?',
        fieldType: 'checkboxes' as const,
        optionCounts: [
          { label: 'Cloud Computing', count: 60, percentage: 60 },
          { label: 'Artificial Intelligence', count: 85, percentage: 85 },
          { label: 'Cyber Security', count: 30, percentage: 30 },
        ],
      },
      {
        questionId: 'q3',
        questionLabel: 'Saran dan masukan',
        fieldType: 'textarea' as const,
        totalCount: 100,
        samples: [
          'Event yang sangat inspiratif!',
          'Materi perlu diperdalam lagi.',
          'Waktunya kurang lama.',
        ],
      },
    ]

    // Mock individual responses
    const responses = Array.from({ length: 10 }, (_, i) => ({
      id: makeMockCuid2(),
      registrationId: makeMockCuid2(),
      contactName: `Peserta ${i + 1}`,
      contactPhone: `0812345678${i}`,
      submittedAt: new Date(Date.now() - i * 3600000).toISOString(),
      answers: {
        q1: 'Sangat Puas',
        q2: ['Cloud Computing', 'Artificial Intelligence'],
        q3: 'Sangat bagus, lanjutkan!',
      },
    }))

    const response: SurveyResponsesApiResponse = {
      total: 100,
      aggregates,
      responses,
    }

    return HttpResponse.json(response)
  }),

  // 5. Get schema by type (Dynamic route LAST)
  http.get('/api/events/:id/survey/:type', async ({ params }) => {
    await delay(300)
    const id = params.id as string
    const type = params.type as 'registration' | 'post-event'
    
    const stored = eventSurveysStore.get(id)?.[type]
    if (stored) return HttpResponse.json(stored)
    
    // Default fallback for registration
    if (type === 'registration') {
      return HttpResponse.json({
        schema: {
          type: 'object',
          properties: {
            jabatan: { type: 'string', title: 'Apa jabatan Anda?' },
            industri: {
              type: 'string',
              title: 'Industri perusahaan Anda?',
              enum: ['Teknologi', 'Kesehatan', 'Manufaktur'],
            },
          },
          required: ['jabatan', 'industri'],
        },
        uiSchema: {},
      })
    }

    // Default empty for post-event
    return HttpResponse.json({
      schema: { type: 'object', properties: {} },
      uiSchema: {},
    })
  }),
]
