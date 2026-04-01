import { describe, it, expect } from 'vitest'

// Test the POST /api/scan/verify MSW handler for all 4 token states.
// We call fetch directly (no hook wrapper needed) since the logic lives in QRScanner.tsx.
// MSW intercepts fetch in the jsdom test environment via server.ts.

async function verifyScan(token: string) {
  const res = await fetch('/api/scan/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  })
  const data = await res.json()
  return { status: res.status, data }
}

describe('POST /api/scan/verify — MSW scan handler', () => {
  it('returns success with registration details for a valid token', async () => {
    const { status, data } = await verifyScan('SOME_VALID_TOKEN')
    expect(status).toBe(200)
    expect(data.status).toBe('success')
    expect(data.registration).toBeDefined()
    expect(typeof data.registration.contactName).toBe('string')
    expect(typeof data.registration.eventName).toBe('string')
  })

  it('returns already_attended with attendedAt for MOCK_ALREADY', async () => {
    const { status, data } = await verifyScan('MOCK_ALREADY')
    expect(status).toBe(200)
    expect(data.status).toBe('already_attended')
    expect(data.attendedAt).toBeDefined()
    expect(typeof data.attendedAt).toBe('string')
  })

  it('returns 400 WRONG_EVENT for MOCK_WRONG_EVENT', async () => {
    const { status, data } = await verifyScan('MOCK_WRONG_EVENT')
    expect(status).toBe(400)
    expect(data.error.code).toBe('WRONG_EVENT')
  })

  it('returns 401 INVALID_TICKET for MOCK_INVALID', async () => {
    const { status, data } = await verifyScan('MOCK_INVALID')
    expect(status).toBe(401)
    expect(data.error.code).toBe('INVALID_TICKET')
  })
})
