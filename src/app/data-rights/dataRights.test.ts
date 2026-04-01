import { describe, it, expect } from 'vitest'

describe('data rights MSW endpoints', () => {
  it('POST /api/participants/data-request returns 202', async () => {
    const res = await fetch('/api/participants/data-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '+6281234567890', email: 'test@example.com' }),
    })
    expect(res.status).toBe(202)
    const body = await res.json()
    expect(body.message).toBe('Request queued')
    expect(body.requestId).toBeTruthy()
  })

  it('POST /api/participants/erasure-request returns 202', async () => {
    const res = await fetch('/api/participants/erasure-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '+6281234567890', email: 'test@example.com' }),
    })
    expect(res.status).toBe(202)
    const body = await res.json()
    expect(body.message).toBe('Erasure queued')
  })
})

describe('phone validation regex', () => {
  const phoneRegex = /^(\+62|08)\d{8,12}$/

  it('accepts +62 format', () => {
    expect(phoneRegex.test('+628123456789')).toBe(true)
  })

  it('accepts 08 format', () => {
    expect(phoneRegex.test('08123456789')).toBe(true)
  })

  it('rejects invalid formats', () => {
    expect(phoneRegex.test('62812345')).toBe(false)
    expect(phoneRegex.test('08123')).toBe(false)
    expect(phoneRegex.test('')).toBe(false)
  })
})
