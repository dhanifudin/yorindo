import type { SurveySchema } from './api'
export type { SurveySchema }

export type SurveyFieldType =
  | 'text'
  | 'textarea'
  | 'radio'
  | 'select'
  | 'checkboxes'
  | 'range'
  | 'grid_radio'
  | 'grid_checkbox'
  | 'date'
  | 'time'
  | 'section'

export interface SurveyFieldOption {
  label: string
  value: string
}

export interface SurveyField {
  id: string // cuid2
  type: SurveyFieldType
  label: string
  required?: boolean
  options?: SurveyFieldOption[] // for radio, select, checkboxes
  minimum?: number // for range
  maximum?: number // for range
  rows?: string[] // for grid_radio, grid_checkbox
  columns?: string[] // for grid_radio, grid_checkbox
  description?: string // for section
}

export interface SurveyResponseAggregate {
  questionId: string
  questionLabel: string
  fieldType: SurveyFieldType
  // For radio/select/checkboxes:
  optionCounts?: { label: string; count: number; percentage: number }[]
  // For range/grid:
  average?: number
  distribution?: { label: string; count: number }[]
  // For text/textarea:
  totalCount?: number
  samples?: string[]
}

export interface SurveyResponseRecord {
  id: string
  registrationId: string
  contactName: string
  contactPhone: string
  submittedAt: string
  answers: Record<string, unknown> // { [fieldId]: value }
}

export interface SurveyResponsesApiResponse {
  total: number
  aggregates: SurveyResponseAggregate[]
  responses: SurveyResponseRecord[]
}
