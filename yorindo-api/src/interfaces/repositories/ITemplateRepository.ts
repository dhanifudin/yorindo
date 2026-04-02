import { Template } from '../../types/domain.js'

export interface ITemplateRepository {
  create(template: Omit<Template, 'id' | 'createdAt' | 'updatedAt'>): Promise<Template>
  findById(id: string): Promise<Template | null>
  findAll(): Promise<Template[]>
  update(id: string, updates: Partial<Template>): Promise<Template | null>
  delete(id: string): Promise<boolean>
}
