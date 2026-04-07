import { createId } from '@paralleldrive/cuid2'
import type { ISurveyRepository } from '../../interfaces/repositories/ISurveyRepository.js'
import type { SurveySchema, SurveyResponse, SurveyField, SurveyType } from '../../types/domain.js'
import { SEED_EVENT_IDS, SEED_REGISTRATION_IDS, SEED_CONTACT_IDS } from './_seeds.js'
import { SURVEY_SCHEMA_IDS } from './EventRepository.js'

// Map registration IDs to their event IDs for response seeding
const SEEDED_REGISTRATION_EVENT_IDS = new Map<string, string>(
  SEED_REGISTRATION_IDS.map((registrationId, index) => {
    const statusIndex = index % 7
    const isAttended = statusIndex === 5 && index < 34
    const activeEventIds = [
      SEED_EVENT_IDS[2]!,
      SEED_EVENT_IDS[3]!,
      SEED_EVENT_IDS[4]!,
      SEED_EVENT_IDS[5]!,
      SEED_EVENT_IDS[6]!,
      SEED_EVENT_IDS[7]!,
    ]

    return [
      registrationId,
      isAttended ? SEED_EVENT_IDS[2]! : activeEventIds[index % activeEventIds.length]!,
    ]
  }),
)

// Seed registration survey schemas
const SEED_REGISTRATION_SCHEMAS: SurveySchema[] = [
  {
    id: SURVEY_SCHEMA_IDS[0]!,
    eventId: SEED_EVENT_IDS[0]!,
    type: 'registration',
    fields: [
      { key: 'expectation', label: 'Apa yang Anda harapkan dari acara ini?', type: 'text', required: true },
      { key: 'experience', label: 'Pengalaman industri Anda', type: 'radio', required: true, options: ['< 1 tahun', '1–3 tahun', '3–5 tahun', '> 5 tahun'] },
      { key: 'topics', label: 'Topik yang diminati', type: 'select', required: false, options: ['AI & Data', 'Cloud', 'Cybersecurity', 'DevOps', 'Product'] },
      { key: 'diet', label: 'Kebutuhan makanan khusus', type: 'text', required: false },
    ] satisfies SurveyField[],
    schema: {
      type: 'object',
      properties: {
        expectation: { type: 'string', title: 'Apa yang Anda harapkan dari acara ini?' },
        experience: { type: 'string', title: 'Pengalaman industri Anda', enum: ['< 1 tahun', '1–3 tahun', '3–5 tahun', '> 5 tahun'] },
        topics: { type: 'string', title: 'Topik yang diminati', enum: ['AI & Data', 'Cloud', 'Cybersecurity', 'DevOps', 'Product'] },
        diet: { type: 'string', title: 'Kebutuhan makanan khusus' },
      },
    },
    uiSchema: {
      expectation: { 'ui:widget': 'textarea' },
      experience: { 'ui:widget': 'radio' },
      topics: { 'ui:widget': 'select' },
      diet: { 'ui:widget': 'text' },
      'ui:order': ['expectation', 'experience', 'topics', 'diet'],
    },
    createdAt: new Date('2026-01-15T00:00:00.000Z').toISOString(),
    updatedAt: new Date('2026-01-15T00:00:00.000Z').toISOString(),
  },
  {
    id: SURVEY_SCHEMA_IDS[2]!,
    eventId: SEED_EVENT_IDS[2]!,
    type: 'registration',
    fields: [
      { key: 'interest', label: 'Bidang yang paling diminati', type: 'select', required: true, options: ['Investasi', 'Perbankan', 'Asuransi', 'Fintech', 'Pasar Modal'] },
      { key: 'portfolio', label: 'Apakah Anda sudah memiliki portofolio investasi?', type: 'radio', required: true, options: ['Ya', 'Tidak', 'Sedang direncanakan'] },
      { key: 'question', label: 'Pertanyaan untuk narasumber', type: 'text', required: false },
    ] satisfies SurveyField[],
    schema: {
      type: 'object',
      properties: {
        interest: { type: 'string', title: 'Bidang yang paling diminati', enum: ['Investasi', 'Perbankan', 'Asuransi', 'Fintech', 'Pasar Modal'] },
        portfolio: { type: 'string', title: 'Apakah Anda sudah memiliki portofolio investasi?', enum: ['Ya', 'Tidak', 'Sedang direncanakan'] },
        question: { type: 'string', title: 'Pertanyaan untuk narasumber' },
      },
    },
    uiSchema: {
      interest: { 'ui:widget': 'select' },
      portfolio: { 'ui:widget': 'radio' },
      question: { 'ui:widget': 'textarea' },
      'ui:order': ['interest', 'portfolio', 'question'],
    },
    createdAt: new Date('2026-02-01T00:00:00.000Z').toISOString(),
    updatedAt: new Date('2026-02-01T00:00:00.000Z').toISOString(),
  },
]

// Seed post-event survey schemas
const SEED_POST_EVENT_SCHEMAS: SurveySchema[] = [
  {
    id: `${SURVEY_SCHEMA_IDS[0]}-post`,
    eventId: SEED_EVENT_IDS[2]!,
    type: 'post-event',
    fields: [
      { key: 'satisfaction', label: 'Seberapa puas Anda dengan acara ini?', type: 'range', required: true, minimum: 1, maximum: 5 },
      { key: 'useful_topics', label: 'Topik mana yang paling berguna?', type: 'checkboxes', required: false, options: ['AI & Data', 'Cloud', 'Cybersecurity', 'DevOps'] },
      { key: 'feedback', label: 'Saran dan masukan', type: 'textarea', required: false },
      { key: 'would_recommend', label: 'Apakah Anda akan merekomendasikan acara ini?', type: 'radio', required: true, options: ['Ya', 'Tidak', 'Mungkin'] },
    ] satisfies SurveyField[],
    schema: {
      type: 'object',
      properties: {
        satisfaction: { type: 'integer', title: 'Seberapa puas Anda dengan acara ini?', minimum: 1, maximum: 5 },
        useful_topics: { type: 'array', title: 'Topik mana yang paling berguna?', items: { type: 'string', enum: ['AI & Data', 'Cloud', 'Cybersecurity', 'DevOps'] }, uniqueItems: true },
        feedback: { type: 'string', title: 'Saran dan masukan' },
        would_recommend: { type: 'string', title: 'Apakah Anda akan merekomendasikan acara ini?', enum: ['Ya', 'Tidak', 'Mungkin'] },
      },
    },
    uiSchema: {
      satisfaction: { 'ui:widget': 'range' },
      useful_topics: { 'ui:widget': 'checkboxes' },
      feedback: { 'ui:widget': 'textarea' },
      would_recommend: { 'ui:widget': 'radio' },
      'ui:order': ['satisfaction', 'useful_topics', 'feedback', 'would_recommend'],
    },
    createdAt: new Date('2026-02-10T00:00:00.000Z').toISOString(),
    updatedAt: new Date('2026-02-10T00:00:00.000Z').toISOString(),
  },
]

// Seed registration survey responses
const SEED_REGISTRATION_RESPONSES: SurveyResponse[] = [
  {
    id: 'cuid2surveyresp000000001',
    eventId: SEED_EVENT_IDS[2]!,
    registrationId: SEED_REGISTRATION_IDS[0]!,
    surveyType: 'registration',
    answers: { interest: 'Fintech', portfolio: 'Ya', question: 'Bagaimana strategi mitigasi risiko untuk investor baru?' },
    submittedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
  {
    id: 'cuid2surveyresp000000002',
    eventId: SEED_EVENT_IDS[2]!,
    registrationId: SEED_REGISTRATION_IDS[1]!,
    surveyType: 'registration',
    answers: { interest: 'Investasi', portfolio: 'Sedang direncanakan', question: 'Instrumen apa yang paling cocok untuk pemula?' },
    submittedAt: new Date(Date.now() - 4 * 86400000).toISOString(),
  },
  {
    id: 'cuid2surveyresp000000003',
    eventId: SEED_EVENT_IDS[2]!,
    registrationId: SEED_REGISTRATION_IDS[2]!,
    surveyType: 'registration',
    answers: { interest: 'Perbankan', portfolio: 'Ya', question: 'Bagaimana melihat tren suku bunga tahun ini?' },
    submittedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
  {
    id: 'cuid2surveyresp000000004',
    eventId: SEED_EVENT_IDS[2]!,
    registrationId: SEED_REGISTRATION_IDS[3]!,
    surveyType: 'registration',
    answers: { interest: 'Asuransi', portfolio: 'Tidak', question: 'Kapan waktu tepat memulai diversifikasi?' },
    submittedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: 'cuid2surveyresp000000005',
    eventId: SEED_EVENT_IDS[2]!,
    registrationId: SEED_REGISTRATION_IDS[4]!,
    surveyType: 'registration',
    answers: { interest: 'Pasar Modal', portfolio: 'Ya', question: 'Bagaimana membaca laporan emiten dengan cepat?' },
    submittedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
  {
    id: 'cuid2surveyresp000000006',
    eventId: SEED_EVENT_IDS[2]!,
    registrationId: SEED_REGISTRATION_IDS[5]!,
    surveyType: 'registration',
    answers: { interest: 'Fintech', portfolio: 'Ya', question: '' },
    submittedAt: new Date(Date.now() - 6 * 86400000).toISOString(),
  },
  {
    id: 'cuid2surveyresp000000007',
    eventId: SEED_EVENT_IDS[2]!,
    registrationId: SEED_REGISTRATION_IDS[6]!,
    surveyType: 'registration',
    answers: { interest: 'Investasi', portfolio: 'Tidak', question: 'Apa risiko terbesar investasi tahun ini?' },
    submittedAt: new Date(Date.now() - 7 * 86400000).toISOString(),
  },
]

// Seed post-event survey responses
const SEED_POST_EVENT_RESPONSES: SurveyResponse[] = [
  {
    id: 'cuid2surveyresp000000010',
    eventId: SEED_EVENT_IDS[2]!,
    registrationId: SEED_REGISTRATION_IDS[0]!,
    surveyType: 'post-event',
    answers: { satisfaction: 4, useful_topics: ['AI & Data', 'Cloud'], feedback: 'Acara sangat bermanfaat!', would_recommend: 'Ya' },
    submittedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
  {
    id: 'cuid2surveyresp000000011',
    eventId: SEED_EVENT_IDS[2]!,
    registrationId: SEED_REGISTRATION_IDS[1]!,
    surveyType: 'post-event',
    answers: { satisfaction: 5, useful_topics: ['Cybersecurity'], feedback: 'Speaker sangat kompeten', would_recommend: 'Ya' },
    submittedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: 'cuid2surveyresp000000012',
    eventId: SEED_EVENT_IDS[2]!,
    registrationId: SEED_REGISTRATION_IDS[2]!,
    surveyType: 'post-event',
    answers: { satisfaction: 3, useful_topics: ['DevOps'], feedback: '', would_recommend: 'Mungkin' },
    submittedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
  {
    id: 'cuid2surveyresp000000013',
    eventId: SEED_EVENT_IDS[2]!,
    registrationId: SEED_REGISTRATION_IDS[3]!,
    surveyType: 'post-event',
    answers: { satisfaction: 4, useful_topics: ['AI & Data', 'Cybersecurity', 'Cloud'], feedback: 'Waktu terlalu singkat', would_recommend: 'Ya' },
    submittedAt: new Date(Date.now() - 4 * 86400000).toISOString(),
  },
  {
    id: 'cuid2surveyresp000000014',
    eventId: SEED_EVENT_IDS[2]!,
    registrationId: SEED_REGISTRATION_IDS[4]!,
    surveyType: 'post-event',
    answers: { satisfaction: 2, useful_topics: [], feedback: 'Topik kurang relevan', would_recommend: 'Tidak' },
    submittedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
]

// Contact name/phone lookup for response enrichment
const CONTACT_LOOKUP = new Map<string, { name: string; phone: string }>([
  ['cuid2contact000000000001', { name: 'Budi Santoso', phone: '+6281234567890' }],
  ['cuid2contact000000000002', { name: 'Siti Rahma', phone: '+6281234567891' }],
  ['cuid2contact000000000003', { name: 'Agus Hartono', phone: '+6281234567892' }],
  ['cuid2contact000000000004', { name: 'Dewi Lestari', phone: '+6281234567893' }],
  ['cuid2contact000000000005', { name: 'Rudi Hermawan', phone: '+6281234567894' }],
  ['cuid2contact000000000006', { name: 'Ani Wijaya', phone: '+6281234567895' }],
  ['cuid2contact000000000007', { name: 'Hendra Pratama', phone: '+6281234567896' }],
])

// Registration → contact mapping for seeded data
const REGISTRATION_CONTACT_MAP = new Map<string, string>()
for (let i = 0; i < SEED_REGISTRATION_IDS.length; i++) {
  REGISTRATION_CONTACT_MAP.set(SEED_REGISTRATION_IDS[i]!, SEED_CONTACT_IDS[i]!)
}

export class InMemorySurveyRepository implements ISurveyRepository {
  // Dual-type storage: key = `${eventId}:${type}`
  private schemas: Map<string, SurveySchema> = new Map()
  // Response storage: key = `${eventId}:${type}`
  private responses: Map<string, SurveyResponse[]> = new Map()

  constructor() {
    this._seed()
  }

  private _seed(): void {
    // Seed registration schemas
    for (const schema of SEED_REGISTRATION_SCHEMAS) {
      this.schemas.set(`${schema.eventId}:registration`, schema)
    }

    // Seed post-event schemas
    for (const schema of SEED_POST_EVENT_SCHEMAS) {
      this.schemas.set(`${schema.eventId}:post-event`, schema)
    }

    // Seed registration responses
    const regKey = `${SEED_EVENT_IDS[2]}:registration`
    this.responses.set(regKey, [...SEED_REGISTRATION_RESPONSES])

    // Seed post-event responses
    const postKey = `${SEED_EVENT_IDS[2]}:post-event`
    this.responses.set(postKey, [...SEED_POST_EVENT_RESPONSES])
  }

  async findByEventId(eventId: string, type: SurveyType): Promise<SurveySchema | null> {
    return this.schemas.get(`${eventId}:${type}`) ?? null
  }

  async upsert(eventId: string, type: SurveyType, schema: SurveySchema): Promise<SurveySchema> {
    const existing = this.schemas.get(`${eventId}:${type}`)
    const updated: SurveySchema = {
      ...schema,
      id: existing?.id ?? `${eventId}-survey-${type}`,
      eventId,
      type,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    this.schemas.set(`${eventId}:${type}`, updated)
    return updated
  }

  async saveResponse(
    registrationId: string,
    eventId: string,
    type: SurveyType,
    answers: Record<string, unknown>,
  ): Promise<void> {
    const response: SurveyResponse = {
      id: createId(),
      eventId,
      registrationId,
      surveyType: type,
      answers,
      submittedAt: new Date().toISOString(),
    }
    const key = `${eventId}:${type}`
    const existing = this.responses.get(key) ?? []
    this.responses.set(key, [...existing, response])
  }

  async getResponsesByEvent(
    eventId: string,
    type: SurveyType,
    page = 1,
    pageSize = 20,
    search?: string,
  ): Promise<{ responses: SurveyResponse[]; total: number }> {
    const key = `${eventId}:${type}`
    let allResponses = this.responses.get(key) ?? []

    // Filter by search (contact name/phone)
    if (search) {
      const searchLower = search.toLowerCase()
      allResponses = allResponses.filter((r) => {
        const contactId = REGISTRATION_CONTACT_MAP.get(r.registrationId)
        if (!contactId) return false
        const contact = CONTACT_LOOKUP.get(contactId)
        if (!contact) return false
        return contact.name.toLowerCase().includes(searchLower) || contact.phone.includes(search)
      })
    }

    const total = allResponses.length
    const start = (page - 1) * pageSize
    const paginated = allResponses.slice(start, start + pageSize)

    return { responses: paginated, total }
  }

  // Helper for enriching responses with contact data (used by routes)
  getContactForRegistration(registrationId: string): { name: string; phone: string } | null {
    const contactId = REGISTRATION_CONTACT_MAP.get(registrationId)
    if (!contactId) return null
    return CONTACT_LOOKUP.get(contactId) ?? null
  }
}
