import type { Pool } from 'pg'
import { createId } from '@paralleldrive/cuid2'
import type { IBlastLogRecipientRepository } from '../../interfaces/repositories/IBlastLogRecipientRepository.js'
import { BasePostgresRepository } from './BasePostgresRepository.js'

export class PostgresBlastLogRecipientRepository
  extends BasePostgresRepository
  implements IBlastLogRecipientRepository
{
  constructor(pool: Pool) {
    super(pool)
  }

  async insertRecipients(blastLogId: string, eventId: string, contactIds: string[], channel: string): Promise<void> {
    if (contactIds.length === 0) return

    const values: string[] = []
    const params: unknown[] = []
    let idx = 1

    for (const contactId of contactIds) {
      const id = createId()
      values.push(`($${idx}, $${idx + 1}, $${idx + 2}, $${idx + 3}, NOW())`)
      params.push(id, blastLogId, contactId, eventId)
      idx += 4
    }

    await this.query(
      `INSERT INTO blast_log_recipients (id, blast_log_id, contact_id, event_id, channel, sent_at)
       VALUES ${values.join(', ')}
       ON CONFLICT (blast_log_id, contact_id) DO NOTHING`,
      params,
    )
  }

  async wasContactInvited(contactId: string, eventId: string): Promise<boolean> {
    const { rows } = await this.query<{ cnt: string }>(
      `SELECT COUNT(*) as cnt FROM blast_log_recipients WHERE contact_id = $1 AND event_id = $2`,
      [contactId, eventId],
    )
    return parseInt(rows[0]?.cnt ?? '0', 10) > 0
  }
}
