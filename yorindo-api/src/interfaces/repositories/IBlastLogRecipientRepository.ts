import type { EntityId } from '../../types/domain.js'

export interface IBlastLogRecipientRepository {
  /** Record all recipients for a blast */
  insertRecipients(blastLogId: string, eventId: string, contactIds: string[], channel: string): Promise<void>
  /** Check if a contact received a blast for an event */
  wasContactInvited(contactId: string, eventId: string): Promise<boolean>
}
