import { SurveyField, SurveySchema } from '@/types/surveys'

export function buildSurveySchema(fields: SurveyField[]): SurveySchema {
  const properties: Record<string, any> = {}
  const uiSchema: Record<string, any> = {}
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
// (Optional but helpful for editing existing surveys)
export function schemaToFields(schema: any, uiSchema: any): SurveyField[] {
  const fields: SurveyField[] = []
  const order = uiSchema?.['ui:order'] || Object.keys(schema?.properties || {})

  order.forEach((key: string) => {
    const prop = schema.properties[key]
    const uiProp = uiSchema[key]
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

    const field: SurveyField = {
      id: key,
      type,
      label: prop.title || '',
      required: schema.required?.includes(key),
    }

    if (type === 'radio' || type === 'select' || type === 'checkboxes') {
      const enums = prop.enum || prop.items?.enum || []
      const enumNames = prop.enumNames || prop.items?.enumNames || enums
      field.options = enums.map((val: string, i: number) => ({
        label: enumNames[i],
        value: val,
      }))
    }

    if (type === 'range') {
      field.minimum = prop.minimum
      field.maximum = prop.maximum
    }

    if (type === 'grid_radio' || type === 'grid_checkbox') {
      field.rows = prop.properties.rows.default
      field.columns = prop.properties.columns.default
    }

    if (type === 'section') {
      field.description = prop.description
    }

    fields.push(field)
  })

  return fields
}
