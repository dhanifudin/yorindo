import type { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg'

export abstract class BasePostgresRepository {
  protected constructor(protected readonly pool: Pool) {}

  protected async query<T extends QueryResultRow>(
    text: string,
    params?: unknown[],
  ): Promise<QueryResult<T>> {
    return this.pool.query<T>(text, params)
  }

  protected async withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect()
    try {
      await client.query('BEGIN')
      const result = await fn(client)
      await client.query('COMMIT')
      return result
    } catch (err) {
      await client.query('ROLLBACK')
      throw this.handlePgError(err)
    } finally {
      client.release()
    }
  }

  protected handlePgError(err: unknown): Error {
    if (typeof err === 'object' && err !== null && 'code' in err) {
      const pgErr = err as { code: string; constraint?: string; detail?: string }
      switch (pgErr.code) {
        case '23505':
          return Object.assign(new Error(`Unique constraint violation: ${pgErr.constraint ?? 'unknown'}`), { code: 'UNIQUE_VIOLATION' })
        case '23503':
          return Object.assign(new Error(`Foreign key violation: ${pgErr.constraint ?? 'unknown'}`), { code: 'FK_VIOLATION' })
        case '23502':
          return Object.assign(new Error(`Not null violation: ${pgErr.detail ?? ''}`), { code: 'NOT_NULL_VIOLATION' })
        default:
          return err instanceof Error ? err : new Error(String(err))
      }
    }
    return err instanceof Error ? err : new Error(String(err))
  }

  protected toIso(val: unknown): string {
    if (!val) return new Date().toISOString()
    if (val instanceof Date) return val.toISOString()
    return String(val)
  }

  protected toIsoOrNull(val: unknown): string | null {
    if (!val) return null
    if (val instanceof Date) return val.toISOString()
    return String(val)
  }

  protected buildBaseWhere(
    base: string[],
    filters: Record<string, { sql: string; value: unknown } | undefined>,
  ): { where: string; values: unknown[]; next: (sql: string) => string } {
    const conditions = [...base]
    const values: unknown[] = []
    let idx = 1

    const next = (sql: string): string => {
      const result = sql.replace('$?', `$${idx}`)
      idx++
      return result
    }

    for (const entry of Object.values(filters)) {
      if (entry === undefined) continue
      conditions.push(next(entry.sql))
      values.push(entry.value)
    }

    return { where: conditions.join(' AND '), values, next }
  }
}
