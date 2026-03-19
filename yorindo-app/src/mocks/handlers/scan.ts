import { http, HttpResponse, delay } from 'msw'
import { faker } from '@faker-js/faker'

export const scanHandlers = [
  http.post('/api/scan/otp/request', async ({ request }) => {
    await delay(400)
    const body = await request.json() as { phone: string; eventId?: string }
    if (!body.phone) {
      return HttpResponse.json(
        { error: { code: 'MISSING_PHONE', message: 'Phone number required', details: [] } },
        { status: 400 }
      )
    }
    return HttpResponse.json({ message: 'OTP dikirim ke ' + body.phone, expiresIn: 300 })
  }),

  http.post('/api/scan/otp/verify', async ({ request }) => {
    await delay(300)
    const body = await request.json() as { phone: string; otp: string; eventId?: string }
    if (body.otp === '000000') {
      return HttpResponse.json(
        { error: { code: 'INVALID_OTP', message: 'OTP tidak valid atau sudah kadaluarsa', details: [] } },
        { status: 400 }
      )
    }
    return HttpResponse.json({
      status: 'success',
      registration: {
        id: faker.string.uuid(),
        contactName: faker.person.fullName(),
        eventName: 'Seminar ERP Jakarta',
      },
    })
  }),

  http.post('/api/scan/manual-checkin', async ({ request }) => {
    await delay(400)
    const body = await request.json() as { registrationId: string; reason: string }
    if (!body.reason?.trim()) {
      return HttpResponse.json(
        { error: { code: 'REASON_REQUIRED', message: 'Override reason is required', details: [] } },
        { status: 400 }
      )
    }
    return HttpResponse.json({
      status: 'success',
      registration: {
        id: body.registrationId,
        contactName: faker.person.fullName(),
        eventName: 'Seminar ERP Jakarta',
        overrideReason: body.reason,
      },
    })
  }),

  http.post('/api/scan/verify', async ({ request }) => {
    await delay(200)
    const body = await request.json() as { token: string }

    if (body.token === 'MOCK_INVALID') {
      return HttpResponse.json(
        { error: { code: 'INVALID_TICKET', message: 'Tiket tidak valid atau sudah kedaluwarsa', details: [] } },
        { status: 401 }
      )
    }

    if (body.token === 'MOCK_WRONG_EVENT') {
      return HttpResponse.json(
        { error: { code: 'WRONG_EVENT', message: 'Tiket bukan untuk event ini', details: [] } },
        { status: 400 }
      )
    }

    if (body.token === 'MOCK_ALREADY') {
      return HttpResponse.json({
        status: 'already_attended',
        attendedAt: faker.date.recent({ days: 1 }).toISOString(),
        message: 'Peserta sudah melakukan check-in sebelumnya',
      })
    }

    return HttpResponse.json({
      status: 'success',
      registration: {
        id: faker.string.uuid(),
        contactName: faker.person.fullName(),
        eventName: 'Seminar ERP Jakarta',
      },
    })
  }),
]
