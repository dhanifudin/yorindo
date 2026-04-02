import { SurveyField, SurveyFieldType, SurveySchema } from '@/types/surveys'

// Typed representation of a JSON Schema property
type JsonSchemaProperty = Record<string, unknown>

export function buildSurveySchema(fields: SurveyField[]): SurveySchema {
  const properties: Record<string, JsonSchemaProperty> = {}
  const uiSchema: Record<string, unknown> = {}
  const required: string[] = []
  const order: string[] = []

  fields.forEach((field) => {
    const key = field.id
    order.push(key)
    if (field.required && field.type !== 'section') {
      required.push(key)
    }

    switch (field.type) {
      case 'text':
        properties[key] = { type: 'string', title: field.label }
        uiSchema[key] = { 'ui:widget': 'text', 'ui:placeholder': 'Ketik jawaban...' }
        break

      case 'textarea':
        properties[key] = { type: 'string', title: field.label }
        uiSchema[key] = { 'ui:widget': 'textarea', 'ui:placeholder': 'Ketik paragraf...' }
        break

      case 'radio':
        properties[key] = {
          type: 'string',
          title: field.label,
          enum: field.options?.map((o) => o.value) || [],
          enumNames: field.options?.map((o) => o.label) || [],
        }
        uiSchema[key] = { 'ui:widget': 'radio' }
        break

      case 'select':
        properties[key] = {
          type: 'string',
          title: field.label,
          enum: field.options?.map((o) => o.value) || [],
          enumNames: field.options?.map((o) => o.label) || [],
        }
        uiSchema[key] = { 'ui:placeholder': 'Pilih salah satu...' }
        break

      case 'checkboxes':
        properties[key] = {
          type: 'array',
          title: field.label,
          items: {
            type: 'string',
            enum: field.options?.map((o) => o.value) || [],
            enumNames: field.options?.map((o) => o.label) || [],
          },
          uniqueItems: true,
        }
        uiSchema[key] = { 'ui:widget': 'checkboxes' }
        break

      case 'range':
        properties[key] = {
          type: 'integer',
          title: field.label,
          minimum: field.minimum ?? 1,
          maximum: field.maximum ?? 5,
        }
        uiSchema[key] = { 'ui:widget': 'range' }
        break

      case 'date':
        properties[key] = { type: 'string', format: 'date', title: field.label }
        uiSchema[key] = { 'ui:widget': 'date' }
        break

      case 'time':
        properties[key] = { type: 'string', format: 'time', title: field.label }
        uiSchema[key] = { 'ui:widget': 'time' }
        break

      case 'grid_radio':
        properties[key] = {
          type: 'object',
          title: field.label,
          'x-widget': 'grid_radio',
          properties: {
            rows: { type: 'array', items: { type: 'string' }, default: field.rows || [] },
            columns: { type: 'array', items: { type: 'string' }, default: field.columns || [] },
          },
        }
        uiSchema[key] = { 'ui:widget': 'GridRadioWidget' }
        break

      case 'grid_checkbox':
        properties[key] = {
          type: 'object',
          title: field.label,
          'x-widget': 'grid_checkbox',
          properties: {
            rows: { type: 'array', items: { type: 'string' }, default: field.rows || [] },
            columns: { type: 'array', items: { type: 'string' }, default: field.columns || [] },
          },
        }
        uiSchema[key] = { 'ui:widget': 'GridCheckboxWidget' }
        break

      case 'section':
        properties[key] = {
          type: 'null',
          title: field.label,
          description: field.description,
          'x-widget': 'section',
        }
        uiSchema[key] = { 'ui:widget': 'SectionWidget' }
        break
    }
  })

  uiSchema['ui:order'] = order

  return {
    schema: {
      type: 'object',
      properties,
      required: required.length > 0 ? required : undefined,
    },
    uiSchema,
  }
}

// Convert schema back to SurveyField[] for the builder
export function schemaToFields(
  schema: Record<string, unknown>,
  uiSchema: Record<string, unknown>
): SurveyField[] {
  const fields: SurveyField[] = []
  const props = (schema?.properties as Record<string, Record<string, unknown>>) ?? {}
  const order = (uiSchema?.['ui:order'] as string[]) || Object.keys(props)

  order.forEach((key) => {
    const prop = props[key]
    const uiProp = (uiSchema[key] as Record<string, unknown>) ?? {}
    if (!prop) return

    let type: SurveyFieldType = 'text'
    if (prop.format === 'date') type = 'date'
    else if (prop.format === 'time') type = 'time'
    else if (uiProp?.['ui:widget'] === 'textarea') type = 'textarea'
    else if (uiProp?.['ui:widget'] === 'radio') type = 'radio'
    else if (uiProp?.['ui:widget'] === 'checkboxes') type = 'checkboxes'
    else if (uiProp?.['ui:widget'] === 'range') type = 'range'
    else if (uiProp?.['ui:widget'] === 'GridRadioWidget') type = 'grid_radio'
    else if (uiProp?.['ui:widget'] === 'GridCheckboxWidget') type = 'grid_checkbox'
    else if (uiProp?.['ui:widget'] === 'SectionWidget') type = 'section'
    else if (prop.enum) type = 'select'

    const required = Array.isArray(schema.required) && (schema.required as string[]).includes(key)

    const field: SurveyField = {
      id: key,
      type,
      label: (prop.title as string) || '',
      required,
    }

    if (type === 'radio' || type === 'select' || type === 'checkboxes') {
      const items = prop.items as Record<string, unknown> | undefined
      const enums = (prop.enum || items?.enum || []) as string[]
      const enumNames = (prop.enumNames || items?.enumNames || enums) as string[]
      field.options = enums.map((val, i) => ({
        label: enumNames[i],
        value: val,
      }))
    }

    if (type === 'range') {
      field.minimum = prop.minimum as number
      field.maximum = prop.maximum as number
    }

    if (type === 'grid_radio' || type === 'grid_checkbox') {
      const gridProps = prop.properties as Record<string, Record<string, unknown>>
      field.rows = gridProps?.rows?.default as string[]
      field.columns = gridProps?.columns?.default as string[]
    }

    if (type === 'section') {
      field.description = prop.description as string
    }

    fields.push(field)
  })

  return fields
}
