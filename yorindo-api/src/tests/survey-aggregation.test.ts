import { describe, it, expect } from 'vitest'
import { SurveyAggregationService } from '../services/SurveyAggregationService.js'
import type { SurveyResponse, SurveySchema } from '../types/domain.js'

describe('SurveyAggregationService', () => {
  const service = new SurveyAggregationService()

  describe('aggregate — single choice (radio/select)', () => {
    const schema: SurveySchema = {
      id: 'test-1',
      eventId: 'event-1',
      fields: [],
      schema: {
        type: 'object',
        properties: {
          interest: {
            type: 'string',
            title: 'Bidang yang diminati',
            enum: ['Fintech', 'Investasi', 'Asuransi'],
          },
        },
      },
      uiSchema: { interest: { 'ui:widget': 'radio' } },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    const responses: SurveyResponse[] = [
      { id: 'r1', eventId: 'event-1', registrationId: 'reg1', answers: { interest: 'Fintech' }, submittedAt: new Date().toISOString() },
      { id: 'r2', eventId: 'event-1', registrationId: 'reg2', answers: { interest: 'Fintech' }, submittedAt: new Date().toISOString() },
      { id: 'r3', eventId: 'event-1', registrationId: 'reg3', answers: { interest: 'Investasi' }, submittedAt: new Date().toISOString() },
      { id: 'r4', eventId: 'event-1', registrationId: 'reg4', answers: {}, submittedAt: new Date().toISOString() },
    ]

    it('returns correct option counts and percentages', () => {
      const aggregates = service.aggregate(responses, schema)
      const interest = aggregates.find((a) => a.questionId === 'interest')!

      expect(interest).toBeDefined()
      expect(interest.fieldType).toBe('radio')
      expect(interest.optionCounts).toHaveLength(3)
      expect(interest.optionCounts).toContainEqual({ label: 'Fintech', count: 2, percentage: 67 })
      expect(interest.optionCounts).toContainEqual({ label: 'Investasi', count: 1, percentage: 33 })
      expect(interest.optionCounts).toContainEqual({ label: 'Asuransi', count: 0, percentage: 0 })
    })

    it('handles empty responses', () => {
      const aggregates = service.aggregate([], schema)
      const interest = aggregates.find((a) => a.questionId === 'interest')!

      expect(interest.optionCounts).toEqual([
        { label: 'Fintech', count: 0, percentage: 0 },
        { label: 'Investasi', count: 0, percentage: 0 },
        { label: 'Asuransi', count: 0, percentage: 0 },
      ])
    })
  })

  describe('aggregate — range', () => {
    const schema: SurveySchema = {
      id: 'test-3',
      eventId: 'event-1',
      fields: [],
      schema: {
        type: 'object',
        properties: {
          satisfaction: {
            type: 'integer',
            title: 'Kepuasan',
            minimum: 1,
            maximum: 5,
          },
        },
      },
      uiSchema: { satisfaction: { 'ui:widget': 'range' } },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    const responses: SurveyResponse[] = [
      { id: 'r1', eventId: 'event-1', registrationId: 'reg1', answers: { satisfaction: 5 }, submittedAt: new Date().toISOString() },
      { id: 'r2', eventId: 'event-1', registrationId: 'reg2', answers: { satisfaction: 4 }, submittedAt: new Date().toISOString() },
      { id: 'r3', eventId: 'event-1', registrationId: 'reg3', answers: { satisfaction: 3 }, submittedAt: new Date().toISOString() },
    ]

    it('returns correct average and distribution', () => {
      const aggregates = service.aggregate(responses, schema)
      const satisfaction = aggregates.find((a) => a.questionId === 'satisfaction')!

      expect(satisfaction.fieldType).toBe('range')
      expect(satisfaction.average).toBe(4)
      expect(satisfaction.distribution).toHaveLength(5)
      expect(satisfaction.distribution).toContainEqual({ label: '5', count: 1 })
      expect(satisfaction.distribution).toContainEqual({ label: '4', count: 1 })
      expect(satisfaction.distribution).toContainEqual({ label: '3', count: 1 })
      expect(satisfaction.distribution).toContainEqual({ label: '2', count: 0 })
      expect(satisfaction.distribution).toContainEqual({ label: '1', count: 0 })
    })
  })

  describe('aggregate — text', () => {
    const schema: SurveySchema = {
      id: 'test-4',
      eventId: 'event-1',
      fields: [],
      schema: {
        type: 'object',
        properties: {
          feedback: { type: 'string', title: 'Masukan' },
        },
      },
      uiSchema: { feedback: { 'ui:widget': 'textarea' } },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    const responses: SurveyResponse[] = [
      { id: 'r1', eventId: 'event-1', registrationId: 'reg1', answers: { feedback: 'Bagus sekali!' }, submittedAt: new Date().toISOString() },
      { id: 'r2', eventId: 'event-1', registrationId: 'reg2', answers: { feedback: 'Perlu peningkatan' }, submittedAt: new Date().toISOString() },
      { id: 'r3', eventId: 'event-1', registrationId: 'reg3', answers: { feedback: '' }, submittedAt: new Date().toISOString() },
      { id: 'r4', eventId: 'event-1', registrationId: 'reg4', answers: {}, submittedAt: new Date().toISOString() },
    ]

    it('returns count and up to 3 samples', () => {
      const aggregates = service.aggregate(responses, schema)
      const feedback = aggregates.find((a) => a.questionId === 'feedback')!

      expect(feedback.fieldType).toBe('text')
      expect(feedback.totalCount).toBe(2)
      expect(feedback.samples).toHaveLength(2)
      expect(feedback.samples).toContain('Bagus sekali!')
      expect(feedback.samples).toContain('Perlu peningkatan')
    })
  })

  describe('aggregate — null schema', () => {
    it('returns empty array when schema is null', () => {
      const responses: SurveyResponse[] = [
        { id: 'r1', eventId: 'event-1', registrationId: 'reg1', answers: { q: 'a' }, submittedAt: new Date().toISOString() },
      ]
      const aggregates = service.aggregate(responses, null)
      expect(aggregates).toEqual([])
    })
  })
})
