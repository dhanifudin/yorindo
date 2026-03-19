import { http, HttpResponse, delay } from 'msw'
import { faker } from '@faker-js/faker'

export const dataRightsHandlers = [
  http.post('/api/participants/data-request', async () => {
    await delay(500)
    return HttpResponse.json(
      { message: 'Request queued', requestId: faker.string.uuid() },
      { status: 202 }
    )
  }),

  http.post('/api/participants/erasure-request', async () => {
    await delay(500)
    return HttpResponse.json(
      { message: 'Erasure queued', requestId: faker.string.uuid() },
      { status: 202 }
    )
  }),
]
