import { openDB } from 'idb'

export interface QueuedScan {
  id: string
  token: string
  queuedAt: string
  eventId?: string
}

export interface SyncResult {
  success: number
  conflicts: Array<{
    token: string
    participantName?: string
    queuedAt: string
    attendedAt?: string
  }>
  errors: number
}

const DB_NAME = 'yorindo-scan'
const STORE_NAME = 'scan-queue'
const DB_VERSION = 1

async function getDb() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    },
  })
}

export async function queueScan(token: string, eventId?: string): Promise<void> {
  const db = await getDb()
  const entry: QueuedScan = {
    id: `scan-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    token,
    queuedAt: new Date().toISOString(),
    eventId,
  }
  await db.put(STORE_NAME, entry)
}

export async function getQueuedScans(): Promise<QueuedScan[]> {
  const db = await getDb()
  return db.getAll(STORE_NAME)
}

export async function getQueueCount(): Promise<number> {
  const db = await getDb()
  return db.count(STORE_NAME)
}

export async function clearQueuedScan(id: string): Promise<void> {
  const db = await getDb()
  await db.delete(STORE_NAME, id)
}

export async function flushScanQueue(): Promise<SyncResult> {
  const db = await getDb()
  const queued = await db.getAll(STORE_NAME)
  const result: SyncResult = { success: 0, conflicts: [], errors: 0 }

  for (const scan of queued) {
    try {
      const res = await fetch('/api/scan/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: scan.token }),
      })
      const data = await res.json()
      if (res.ok) {
        if (data.status === 'already_attended') {
          result.conflicts.push({
            token: scan.token,
            participantName: data.registration?.contactName,
            queuedAt: scan.queuedAt,
            attendedAt: data.attendedAt,
          })
        } else {
          result.success++
        }
        await db.delete(STORE_NAME, scan.id)
      } else {
        result.errors++
        // Leave in queue for retry on next sync
      }
    } catch {
      result.errors++
    }
  }
  return result
}
