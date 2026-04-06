import type {
  SurveyResponse,
  SurveySchema,
  SurveyResponseAggregate,
  SurveyFieldType,
} from '../types/domain.js'

/**
 * SurveyAggregationService
 *
 * Pure function service that computes per-question breakdowns from raw survey responses.
 * Does NOT touch the database — takes SurveyResponse[] + SurveySchema as input.
 */
export class SurveyAggregationService {
  /**
   * Aggregate all questions in a survey schema.
   */
  aggregate(
    responses: SurveyResponse[],
    schema: SurveySchema | null,
  ): SurveyResponseAggregate[] {
    if (!schema || !schema.schema?.properties) {
      return this.aggregateFromFields(responses, schema?.fields ?? [])
    }

    const aggregates: SurveyResponseAggregate[] = []

    for (const [fieldId, fieldSchema] of Object.entries(schema.schema.properties)) {
      const fieldType = this.inferFieldType(fieldSchema)

      if (fieldType === 'radio' || fieldType === 'select') {
        aggregates.push(this.aggregateSingleChoice(responses, fieldId, fieldSchema))
      } else if (fieldType === 'checkboxes') {
        aggregates.push(this.aggregateMultiChoice(responses, fieldId, fieldSchema))
      } else if (fieldType === 'range') {
        aggregates.push(this.aggregateRange(responses, fieldId, fieldSchema))
      } else if (fieldType === 'text' || fieldType === 'textarea') {
        aggregates.push(this.aggregateText(responses, fieldId))
      } else if (fieldType === 'grid_radio' || fieldType === 'grid_checkbox') {
        aggregates.push(this.aggregateGrid(responses, fieldId, fieldSchema, fieldType))
      }
    }

    return aggregates
  }

  private aggregateFromFields(
    responses: SurveyResponse[],
    fields: Array<{ key: string; type: string; label: string; options?: string[] }>,
  ): SurveyResponseAggregate[] {
    return fields.map((field) => {
      const fieldType = this.mapLegacyType(field.type)

      if (fieldType === 'radio' || fieldType === 'select') {
        return this.aggregateSingleChoice(responses, field.key, {
          title: field.label,
          enum: field.options,
        })
      }
      if (fieldType === 'text' || fieldType === 'textarea') {
        return this.aggregateText(responses, field.key)
      }
      if (fieldType === 'range') {
        return this.aggregateRange(responses, field.key, { title: field.label, minimum: 1, maximum: 5 })
      }

      return {
        questionId: field.key,
        questionLabel: field.label,
        fieldType,
        totalCount: responses.filter((r) => r.answers[field.key] != null).length,
      }
    })
  }

  private inferFieldType(fieldSchema: Record<string, unknown>): SurveyFieldType {
    const type = fieldSchema.type as string | undefined

    if (type === 'integer' || type === 'number') {
      if (fieldSchema.minimum != null && fieldSchema.maximum != null) return 'range'
      return 'text'
    }
    if (type === 'array') return 'checkboxes'
    if (type === 'object') {
      const widget = fieldSchema['x-widget'] as string | undefined
      if (widget === 'grid_radio') return 'grid_radio'
      if (widget === 'grid_checkbox') return 'grid_checkbox'
      return 'text'
    }
    if (type === 'null') return 'section'
    if (Array.isArray(fieldSchema.enum)) return 'radio'

    const format = fieldSchema.format as string | undefined
    if (format === 'date') return 'date'
    if (format === 'time') return 'time'

    return 'text'
  }

  private mapLegacyType(type: string): SurveyFieldType {
    const map: Record<string, SurveyFieldType> = {
      text: 'text',
      textarea: 'textarea',
      radio: 'radio',
      select: 'select',
      checkbox: 'checkboxes',
      checkboxes: 'checkboxes',
      number: 'text',
      range: 'range',
      date: 'date',
      time: 'time',
      section: 'section',
      grid_radio: 'grid_radio',
      grid_checkbox: 'grid_checkbox',
    }
    return map[type] ?? 'text'
  }

  private aggregateSingleChoice(
    responses: SurveyResponse[],
    fieldId: string,
    fieldSchema: Record<string, unknown>,
  ): SurveyResponseAggregate {
    const optionCounts: Record<string, number> = {}
    const options = Array.isArray(fieldSchema.enum) ? fieldSchema.enum as string[] : []

    for (const opt of options) {
      optionCounts[opt] = 0
    }

    let total = 0
    for (const response of responses) {
      const val = response.answers[fieldId] as string | undefined
      if (val) {
        optionCounts[val] = (optionCounts[val] || 0) + 1
        total++
      }
    }

    return {
      questionId: fieldId,
      questionLabel: (fieldSchema.title as string) || fieldId,
      fieldType: 'radio',
      optionCounts: Object.entries(optionCounts).map(([label, count]) => ({
        label,
        count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0,
      })),
    }
  }

  private aggregateMultiChoice(
    responses: SurveyResponse[],
    fieldId: string,
    fieldSchema: Record<string, unknown>,
  ): SurveyResponseAggregate {
    const optionCounts: Record<string, number> = {}
    const items = fieldSchema.items as Record<string, unknown> | undefined
    const options = Array.isArray(items?.enum) ? items.enum as string[] : []

    for (const opt of options) {
      optionCounts[opt] = 0
    }

    let total = 0
    for (const response of responses) {
      const vals = response.answers[fieldId] as string[] | undefined
      if (Array.isArray(vals)) {
        total++
        for (const val of vals) {
          optionCounts[val] = (optionCounts[val] || 0) + 1
        }
      }
    }

    return {
      questionId: fieldId,
      questionLabel: (fieldSchema.title as string) || fieldId,
      fieldType: 'checkboxes',
      optionCounts: Object.entries(optionCounts).map(([label, count]) => ({
        label,
        count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0,
      })),
    }
  }

  private aggregateRange(
    responses: SurveyResponse[],
    fieldId: string,
    fieldSchema: Record<string, unknown>,
  ): SurveyResponseAggregate {
    const values: number[] = []
    const min = (fieldSchema.minimum as number) ?? 1
    const max = (fieldSchema.maximum as number) ?? 5

    for (const response of responses) {
      const val = response.answers[fieldId]
      if (typeof val === 'number') {
        values.push(val)
      }
    }

    const avg = values.length > 0
      ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100
      : 0

    const distribution: Array<{ label: string; count: number }> = []
    for (let i = min; i <= max; i++) {
      distribution.push({
        label: String(i),
        count: values.filter((v) => v === i).length,
      })
    }

    return {
      questionId: fieldId,
      questionLabel: (fieldSchema.title as string) || fieldId,
      fieldType: 'range',
      average: avg,
      distribution,
    }
  }

  private aggregateText(
    responses: SurveyResponse[],
    fieldId: string,
  ): SurveyResponseAggregate {
    const samples: string[] = []

    for (const response of responses) {
      const val = response.answers[fieldId] as string | undefined
      if (typeof val === 'string' && val.trim().length > 0) {
        samples.push(val.trim().substring(0, 200))
        if (samples.length >= 3) break
      }
    }

    const totalCount = responses.filter(
      (r) => typeof r.answers[fieldId] === 'string' && (r.answers[fieldId] as string).trim().length > 0,
    ).length

    return {
      questionId: fieldId,
      questionLabel: fieldId,
      fieldType: 'text',
      totalCount,
      samples,
    }
  }

  private aggregateGrid(
    responses: SurveyResponse[],
    fieldId: string,
    fieldSchema: Record<string, unknown>,
    fieldType: 'grid_radio' | 'grid_checkbox',
  ): SurveyResponseAggregate {
    const properties = fieldSchema.properties as Record<string, unknown> | undefined
    const rows = (properties?.rows as { default?: string[] })?.default ?? []
    const columns = (properties?.columns as { default?: string[] })?.default ?? []

    const rowDistributions: Array<{ label: string; count: number }> = []

    for (const row of rows) {
      let total = 0
      for (const response of responses) {
        const answer = response.answers[fieldId] as Record<string, unknown> | undefined
        if (answer && answer[row]) {
          total++
        }
      }

      rowDistributions.push({
        label: row,
        count: total,
      })
    }

    return {
      questionId: fieldId,
      questionLabel: (fieldSchema.title as string) || fieldId,
      fieldType,
      distribution: rowDistributions,
    }
  }
}
