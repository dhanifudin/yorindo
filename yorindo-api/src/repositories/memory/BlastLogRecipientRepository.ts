import type { IBlastLogRecipientRepository } from '../../interfaces/repositories/IBlastLogRecipientRepository.js'

export class InMemoryBlastLogRecipientRepository implements IBlastLogRecipientRepository {
  private recipients = new Set<string>() // "contactId:eventId"

  async insertRecipients(_blastLogId: string, _eventId: string, contactIds: string[], _channel: string): Promise<void> {
    for (const contactId of contactIds) {
      this.recipients.add(`${contactId}:${_eventId}`)
    }
  }

  async wasContactInvited(contactId: string, eventId: string): Promise<boolean> {
    return this.recipients.has(`${contactId}:${eventId}`)
  }
}
