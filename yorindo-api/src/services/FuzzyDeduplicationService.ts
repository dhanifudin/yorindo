import type { IContactRepository } from '../interfaces/repositories/IContactRepository.js'
import type { IDeduplicationService } from '../interfaces/services/IDeduplicationService.js'
import type { Contact } from '../types/domain.js'

export class FuzzyDeduplicationService implements IDeduplicationService {
  constructor(private contactRepository: IContactRepository) {}

  async findPotentialDuplicates(contact: Contact): Promise<void> {
    await this.contactRepository.findByPhone(contact.phone)
  }
}
