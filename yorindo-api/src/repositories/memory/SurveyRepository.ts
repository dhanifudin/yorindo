import { createId } from '@paralleldrive/cuid2'
import type { ISurveyRepository } from '../../interfaces/repositories/ISurveyRepository.js'
import type { SurveySchema, SurveyResponse, SurveyField } from '../../types/domain.js'
import { SEED_EVENT_IDS, SEED_REGISTRATION_IDS } from './_seeds.js'
import { SURVEY_SCHEMA_IDS } from './EventRepository.js'

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

const SEED_SCHEMAS: SurveySchema[] = [
  {
    id: SURVEY_SCHEMA_IDS[0]!,
    eventId: SEED_EVENT_IDS[0]!,
    fields: [
      { key: 'expectation', label: 'Apa yang Anda harapkan dari acara ini?', type: 'text', required: true },
      { key: 'experience', label: 'Pengalaman industri Anda', type: 'radio', required: true, options: ['< 1 tahun', '1–3 tahun', '3–5 tahun', '> 5 tahun'] },
      { key: 'topics', label: 'Topik yang diminati', type: 'select', required: false, options: ['AI & Data', 'Cloud', 'Cybersecurity', 'DevOps', 'Product'] },
      { key: 'diet', label: 'Kebutuhan makanan khusus', type: 'text', required: false },
    ] satisfies SurveyField[],
    createdAt: new Date('2026-01-15T00:00:00.000Z').toISOString(),
    updatedAt: new Date('2026-01-15T00:00:00.000Z').toISOString(),
  },
  {
    id: SURVEY_SCHEMA_IDS[1]!,
    eventId: SEED_EVENT_IDS[1]!,
    fields: [
      { key: 'role', label: 'Jabatan Anda saat ini', type: 'radio', required: true, options: ['C-Level', 'Manajer', 'Supervisor', 'Staf'] },
      { key: 'company_size', label: 'Ukuran perusahaan', type: 'select', required: true, options: ['< 50 karyawan', '50–200', '200–1000', '> 1000'] },
      { key: 'goals', label: 'Tujuan menghadiri seminar', type: 'text', required: true },
    ] satisfies SurveyField[],
    createdAt: new Date('2026-01-20T00:00:00.000Z').toISOString(),
    updatedAt: new Date('2026-01-20T00:00:00.000Z').toISOString(),
  },
  {
    id: SURVEY_SCHEMA_IDS[2]!,
    eventId: SEED_EVENT_IDS[2]!,
    fields: [
      { key: 'interest', label: 'Bidang yang paling diminati', type: 'select', required: true, options: ['Investasi', 'Perbankan', 'Asuransi', 'Fintech', 'Pasar Modal'] },
      { key: 'portfolio', label: 'Apakah Anda sudah memiliki portofolio investasi?', type: 'radio', required: true, options: ['Ya', 'Tidak', 'Sedang direncanakan'] },
      { key: 'question', label: 'Pertanyaan untuk narasumber', type: 'text', required: false },
    ] satisfies SurveyField[],
    createdAt: new Date('2026-02-01T00:00:00.000Z').toISOString(),
    updatedAt: new Date('2026-02-01T00:00:00.000Z').toISOString(),
  },
]

export class InMemorySurveyRepository implements ISurveyRepository {
  private schemas: Map<string, SurveySchema> = new Map()  // eventId → SurveySchema
  private responses: Map<string, SurveyResponse[]> = new Map() // eventId → responses

  constructor() {
    this._seed()
  }

  private _seed(): void {
    for (const schema of SEED_SCHEMAS) {
      this.schemas.set(schema.eventId, schema)
    }

    // Seed 5 survey responses for attended registrations
    const sampleAnswers = [
      { interest: 'Fintech', portfolio: 'Ya', question: 'Bagaimana strategi mitigasi risiko untuk investor baru?' },
      { interest: 'Investasi', portfolio: 'Sedang direncanakan', question: 'Instrumen apa yang paling cocok untuk pemula?' },
      { interest: 'Perbankan', portfolio: 'Ya', question: 'Bagaimana melihat tren suku bunga tahun ini?' },
      { interest: 'Asuransi', portfolio: 'Tidak', question: 'Kapan waktu tepat memulai diversifikasi?' },
      { interest: 'Pasar Modal', portfolio: 'Ya', question: 'Bagaimana membaca laporan emiten dengan cepat?' },
    ]

    const attendedRegIndexes = [5, 12, 19, 26, 33]

    for (let i = 0; i < 5; i++) {
      const response: SurveyResponse = {
        id: createId(),
        eventId: SEED_EVENT_IDS[2]!,
        registrationId: SEED_REGISTRATION_IDS[attendedRegIndexes[i]!]!,
        answers: sampleAnswers[i]!,
        submittedAt: new Date(Date.now() - (5 - i) * 86400000).toISOString(),
      }
      const existing = this.responses.get(SEED_EVENT_IDS[2]!) ?? []
      this.responses.set(SEED_EVENT_IDS[2]!, [...existing, response])
    }
  }

  async findByEventId(eventId: string): Promise<SurveySchema | null> {
    return this.schemas.get(eventId) ?? null
  }

  async upsert(eventId: string, schema: SurveySchema): Promise<SurveySchema> {
    const updated: SurveySchema = { ...schema, eventId, updatedAt: new Date().toISOString() }
    this.schemas.set(eventId, updated)
    return updated
  }

  async saveResponse(registrationId: string, answers: Record<string, unknown>): Promise<void> {
    const eventId = SEEDED_REGISTRATION_EVENT_IDS.get(registrationId) ?? 'default'

    const response: SurveyResponse = {
      id: createId(),
      eventId,
      registrationId,
      answers,
      submittedAt: new Date().toISOString(),
    }
    const existing = this.responses.get(eventId) ?? []
    this.responses.set(eventId, [...existing, response])
  }

  async getResponsesByEvent(eventId: string): Promise<SurveyResponse[]> {
    return this.responses.get(eventId) ?? []
  }
}
