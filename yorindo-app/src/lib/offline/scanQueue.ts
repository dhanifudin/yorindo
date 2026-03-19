import { openDB } from 'idb'

const DB_NAME = 'yorindo-checkin'
const DB_VERSION = 1

export interface CachedParticipant {
  id: string
  name: string
  phone: string
  ticketToken: string
  status: string
}

export interface PendingScan {
  id?: number
  token: string
  queuedAt: string
}

async function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('participants')) {
        db.createObjectStore('participants', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('pendingScan')) {
        db.createObjectStore('pendingScan', { autoIncrement: true })
      }
    },
  })
}

export async function cacheParticipants(participants: CachedParticipant[]): Promise<void> {
  const db = await getDB()
  const tx = db.transaction('participants', 'readwrite')
  await Promise.all(participants.map((p) => tx.store.put(p)))
  await tx.done
}

export async function getCachedParticipants(): Promise<CachedParticipant[]> {
  const db = await getDB()
  return db.getAll('participants')
}

export async function queueScan(token: string): Promise<void> {
  const db = await getDB()
  await db.add('pendingScan', { token, queuedAt: new Date().toISOString() })
}

export async function getPendingScans(): Promise<PendingScan[]> {
  const db = await getDB()
  const tx = db.transaction('pendingScan', 'readonly')
  const all = await tx.store.getAll()
  const keys = await tx.store.getAllKeys()
  return all.map((item, i) => ({ ...item, id: keys[i] as number }))
}

export async function clearPendingScan(id: number): Promise<void> {
  const db = await getDB()
  await db.delete('pendingScan', id)
}
