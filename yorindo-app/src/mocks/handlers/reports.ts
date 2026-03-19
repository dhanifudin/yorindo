import { http, HttpResponse, delay } from 'msw'

const mockReport = {
  eventId: 'event-001',
  totalInvited: 500,
  registered: 180,
  approved: 120,
  attended: 95,
  attendanceRate: (95 / 120 * 100).toFixed(1),
  noShowRate: (25 / 120 * 100).toFixed(1),
  industryBreakdown: [
    { industry: 'teknologi', count: 38 },
    { industry: 'manufaktur', count: 22 },
    { industry: 'kesehatan', count: 18 },
    { industry: 'keuangan', count: 12 },
    { industry: 'other', count: 5 },
  ],
  cityBreakdown: [
    { city: 'Jakarta', count: 55 },
    { city: 'Surabaya', count: 20 },
    { city: 'Bandung', count: 12 },
    { city: 'Medan', count: 8 },
  ],
  jobTitleBreakdown: [
    { level: 'C-Level', count: 15 },
    { level: 'Director', count: 28 },
    { level: 'Manager', count: 35 },
    { level: 'Staff', count: 17 },
  ],
}

const VENDOR_DPA_VERSION = 'v2.1'

const vendorReportStore: Map<string, { dpaAccepted: boolean; dpaVersion: string }> = new Map([
  ['magic-token-valid', { dpaAccepted: false, dpaVersion: VENDOR_DPA_VERSION }],
  ['magic-token-accepted', { dpaAccepted: true, dpaVersion: VENDOR_DPA_VERSION }],
])

export const reportHandlers = [
  http.get('/api/events/:id/report', async () => {
    await delay(600)
    return HttpResponse.json(mockReport)
  }),

  http.get('/api/vendor-report/:token', async ({ params }) => {
    await delay(400)
    const token = params.token as string
    if (token === 'EXPIRED_TOKEN') {
      return HttpResponse.json(
        { error: { code: 'EXPIRED_LINK', message: 'Link ini sudah kadaluarsa (>7 hari)', details: [] } },
        { status: 403 }
      )
    }
    const state = vendorReportStore.get(token) ?? { dpaAccepted: false, dpaVersion: VENDOR_DPA_VERSION }
    return HttpResponse.json({
      token,
      eventName: 'Seminar ERP Jakarta',
      dpaVersion: state.dpaVersion,
      dpaAccepted: state.dpaAccepted,
      report: state.dpaAccepted ? mockReport : null,
    })
  }),

  http.post('/api/vendor-report/:token/dpa', async ({ params }) => {
    await delay(300)
    const token = params.token as string
    vendorReportStore.set(token, { dpaAccepted: true, dpaVersion: VENDOR_DPA_VERSION })
    return HttpResponse.json({ accepted: true, dpaVersion: VENDOR_DPA_VERSION })
  }),
]
