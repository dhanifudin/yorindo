import type { Contact } from '../../types/domain.js'

export interface IDeduplicationService {
  findPotentialDuplicates(contact: Contact): Promise<void>
}
