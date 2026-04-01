import { describe, it, expect, beforeEach } from 'vitest'
import 'fake-indexeddb/auto'
import { cacheParticipants, getCachedParticipants, queueScan, getPendingScans, clearPendingScan } from './scanQueue'

const sampleParticipants = [
  { id: 'p-001', name: 'Budi Santoso', phone: '+628123456789', ticketToken: 'TOKEN123', status: 'approved' },
  { id: 'p-002', name: 'Sari Dewi', phone: '+628987654321', ticketToken: 'TOKEN456', status: 'approved' },
]

describe('scanQueue IndexedDB utilities', () => {
  it('cacheParticipants stores records and getCachedParticipants retrieves them', async () => {
    await cacheParticipants(sampleParticipants)
    const cached = await getCachedParticipants()

    expect(cached.length).toBeGreaterThanOrEqual(2)
    const ids = cached.map((p) => p.id)
    expect(ids).toContain('p-001')
    expect(ids).toContain('p-002')
  })

  it('queueScan adds a pending scan entry', async () => {
    await queueScan('TOKEN_ABC')
    const pending = await getPendingScans()

    expect(pending.length).toBeGreaterThanOrEqual(1)
    const tokens = pending.map((s) => s.token)
    expect(tokens).toContain('TOKEN_ABC')
  })

  it('clearPendingScan removes the entry by id', async () => {
    await queueScan('TOKEN_TO_CLEAR')
    const before = await getPendingScans()
    const entry = before.find((s) => s.token === 'TOKEN_TO_CLEAR')
    expect(entry).toBeDefined()

    await clearPendingScan(entry!.id!)
    const after = await getPendingScans()
    expect(after.find((s) => s.token === 'TOKEN_TO_CLEAR')).toBeUndefined()
  })
})
