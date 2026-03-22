import { readFile, writeFile, unlink, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'
import { config } from '../config/index.js'

export async function ensureDir(dir: string): Promise<void> {
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true })
  }
}

export async function writeSnapshot(filename: string, data: unknown): Promise<string> {
  await ensureDir(config.snapshotDir)
  const filePath = join(config.snapshotDir, filename)
  await writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8')
  return filePath
}

export async function readSnapshot<T>(filename: string): Promise<T> {
  const filePath = join(config.snapshotDir, filename)
  const content = await readFile(filePath, 'utf-8')
  return JSON.parse(content) as T
}

export async function deleteFile(filePath: string): Promise<void> {
  await unlink(filePath)
}

export async function readUploadFile(filePath: string): Promise<Buffer> {
  return readFile(filePath)
}
