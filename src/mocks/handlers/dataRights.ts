import { http, HttpResponse, delay } from 'msw'
import { makeMockCuid2 } from './id'

export const dataRightsHandlers = [
  http.post('/api/participants/data-request', async () => {
    await delay(500)
    return HttpResponse.json(
      { message: 'Request queued', requestId: makeMockCuid2() },
      { status: 202 }
    )
  }),

  http.post('/api/participants/erasure-request', async () => {
    await delay(500)
    return HttpResponse.json(
      { message: 'Erasure queued', requestId: makeMockCuid2() },
      { status: 202 }
    )
  }),
]
