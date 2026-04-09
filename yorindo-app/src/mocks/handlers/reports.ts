import { http, HttpResponse, delay } from 'msw'

// ─── 4 Distinct Event Report Profiles ────────────────────────────────────────
// Profile 0: Small meetup (low numbers, high engagement)
// Profile 1: Standard workshop (medium numbers)
// Profile 2: Large conference (high numbers, moderate engagement)
// Profile 3: Archive event (completed, full data)

const REPORT_PROFILES = [
  // Profile 0: Small Meetup
  {
    totalInvited: 60,
    registered: 42,
    approved: 38,
    attended: 35,
    attendanceRate: '92.1',
    noShowRate: '7.9',
    industryBreakdown: [
      { industry: 'teknologi', count: 18 },
      { industry: 'manufaktur', count: 10 },
      { industry: 'kesehatan', count: 8 },
      { industry: 'other', count: 4 },
    ],
    cityBreakdown: [
      { city: 'Jakarta', count: 25 },
      { city: 'Bandung', count: 10 },
      { city: 'Surabaya', count: 7 },
    ],
    jobTitleBreakdown: [
      { level: 'C-Level', count: 5 },
      { level: 'Director', count: 8 },
      { level: 'Manager', count: 15 },
      { level: 'Staff', count: 7 },
    ],
  },

  // Profile 1: Standard Workshop
  {
    totalInvited: 200,
    registered: 85,
    approved: 65,
    attended: 48,
    attendanceRate: '73.8',
    noShowRate: '26.2',
    industryBreakdown: [
      { industry: 'keuangan', count: 20 },
      { industry: 'teknologi', count: 18 },
      { industry: 'manufaktur', count: 12 },
      { industry: 'kesehatan', count: 10 },
      { industry: 'other', count: 5 },
    ],
    cityBreakdown: [
      { city: 'Jakarta', count: 30 },
      { city: 'Surabaya', count: 15 },
      { city: 'Bandung', count: 10 },
      { city: 'Medan', count: 8 },
    ],
    jobTitleBreakdown: [
      { level: 'C-Level', count: 8 },
      { level: 'Director', count: 15 },
      { level: 'Manager', count: 22 },
      { level: 'Staff', count: 15 },
    ],
  },

  // Profile 2: Large Conference
  {
    totalInvited: 800,
    registered: 320,
    approved: 245,
    attended: 185,
    attendanceRate: '75.5',
    noShowRate: '24.5',
    industryBreakdown: [
      { industry: 'teknologi', count: 85 },
      { industry: 'keuangan', count: 55 },
      { industry: 'manufaktur', count: 42 },
      { industry: 'kesehatan', count: 35 },
      { industry: 'retail', count: 18 },
      { industry: 'other', count: 10 },
    ],
    cityBreakdown: [
      { city: 'Jakarta', count: 120 },
      { city: 'Surabaya', count: 45 },
      { city: 'Bandung', count: 35 },
      { city: 'Denpasar', count: 22 },
      { city: 'Medan', count: 18 },
    ],
    jobTitleBreakdown: [
      { level: 'C-Level', count: 35 },
      { level: 'Director', count: 65 },
      { level: 'Manager', count: 85 },
      { level: 'Staff', count: 45 },
    ],
  },

  // Profile 3: Archive Event (completed)
  {
    totalInvited: 500,
    registered: 180,
    approved: 120,
    attended: 95,
    attendanceRate: '79.2',
    noShowRate: '20.8',
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
  },
]

// Deterministic profile selector based on event ID
function getReportProfile(eventId: string) {
  // Simple hash: sum char codes mod 4
  let hash = 0
  for (let i = 0; i < eventId.length; i++) {
    hash = (hash + eventId.charCodeAt(i)) % 1000
  }
  return REPORT_PROFILES[hash % REPORT_PROFILES.length]
}

const VENDOR_DPA_VERSION = 'v2.1'

const vendorReportStore: Map<string, { dpaAccepted: boolean; dpaVersion: string }> = new Map([
  ['magic-token-valid', { dpaAccepted: false, dpaVersion: VENDOR_DPA_VERSION }],
  ['magic-token-accepted', { dpaAccepted: true, dpaVersion: VENDOR_DPA_VERSION }],
])

export const reportHandlers = [
  http.get('/api/events/:id/report', async ({ params }) => {
    await delay(600)
    const eventId = params.id as string
    const profile = getReportProfile(eventId)
    return HttpResponse.json({ eventId, ...profile })
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
    const profile = getReportProfile('event-001')
    return HttpResponse.json({
      token,
      eventName: 'Seminar ERP Jakarta',
      dpaVersion: state.dpaVersion,
      dpaAccepted: state.dpaAccepted,
      report: state.dpaAccepted ? profile : null,
    })
  }),

  http.post('/api/vendor-report/:token/dpa', async ({ params }) => {
    await delay(300)
    const token = params.token as string
    vendorReportStore.set(token, { dpaAccepted: true, dpaVersion: VENDOR_DPA_VERSION })
    return HttpResponse.json({ accepted: true, dpaVersion: VENDOR_DPA_VERSION })
  }),
]
