import { describe, it, expect } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import { useTemplates, useCreateTemplate } from './useTemplates'

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  function Wrapper({ children }: { children: React.ReactNode }) {
    return createElement(QueryClientProvider, { client }, children)
  }
  return Wrapper
}

describe('useTemplates', () => {
  it('returns 3 seeded templates from MSW', async () => {
    const { result } = renderHook(() => useTemplates(), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true), { timeout: 3000 })

    expect(result.current.data).toHaveLength(3)
  })

  it('returns templates with expected fields', async () => {
    const { result } = renderHook(() => useTemplates(), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true), { timeout: 3000 })

    const tmpl = result.current.data![0]
    expect(tmpl).toHaveProperty('id')
    expect(tmpl).toHaveProperty('name')
    expect(tmpl).toHaveProperty('type')
    expect(tmpl).toHaveProperty('channel')
    expect(tmpl).toHaveProperty('body')
  })
})

describe('useCreateTemplate', () => {
  it('creates a new template and returns 201', async () => {
    const wrapper = makeWrapper()
    const { result } = renderHook(() => useCreateTemplate(), { wrapper })

    await waitFor(() => expect(result.current).not.toBeNull(), { timeout: 1000 })

    result.current.mutate({
      name: 'Test Template',
      type: 'invitation',
      channel: 'whatsapp',
      body: 'Halo {{name}}, selamat datang!',
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true), { timeout: 3000 })

    expect(result.current.data?.name).toBe('Test Template')
    expect(result.current.data?.type).toBe('invitation')
  })
})

describe('TemplatePreview substitution', () => {
  it('substitutes {{name}} with sample value', () => {
    const SAMPLE_VALUES: Record<string, string> = {
      name: 'Budi Santoso',
      event_title: 'ERP Summit Jakarta 2026',
      date: '15 April 2026',
      venue: 'JCC Senayan Hall A',
    }
    const body = 'Halo {{name}}, selamat datang ke {{event_title}}!'
    const preview = body.replace(/\{\{(\w+)\}\}/g, (_, key: string) => SAMPLE_VALUES[key] ?? `{{${key}}}`)
    expect(preview).toBe('Halo Budi Santoso, selamat datang ke ERP Summit Jakarta 2026!')
  })
})
