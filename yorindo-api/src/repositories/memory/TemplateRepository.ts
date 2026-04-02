import { ITemplateRepository } from '../../interfaces/repositories/ITemplateRepository.js'
import { Template } from '../../types/domain.js'
import { createId } from '@paralleldrive/cuid2'

export class InMemoryTemplateRepository implements ITemplateRepository {
  private templates: Map<string, Template> = new Map()

  constructor() {
    this.seed()
  }

  private seed() {
    const now = new Date().toISOString()
    const seeded = [
      {
        id: 'tmpl-001', name: 'Undangan Event', type: 'invitation' as const, channel: 'whatsapp' as const,
        body: 'Halo *{{name}}*, Anda diundang ke *{{event_title}}* pada _{{date}}_ di {{venue}}.\n\nSegera daftarkan diri Anda!',
        createdAt: now, updatedAt: now
      },
      {
        id: 'tmpl-002', name: 'Konfirmasi Tiket', type: 'confirmation' as const, channel: 'email' as const,
        body: '<p>Selamat <strong>{{name}}</strong>! Registrasi Anda untuk <strong>{{event_title}}</strong> pada {{date}} di {{venue}} telah disetujui.</p><p>Tunjukkan QR code berikut saat check-in:</p>{{qr_code}}',
        createdAt: now, updatedAt: now
      },
      {
        id: 'tmpl-003', name: 'Penolakan', type: 'rejection' as const, channel: 'email' as const,
        body: '<p>Maaf <strong>{{name}}</strong>, registrasi Anda untuk <strong>{{event_title}}</strong> tidak dapat kami terima saat ini.</p>',
        createdAt: now, updatedAt: now
      },
      {
        id: 'tmpl-004', name: 'Pengiriman Tiket', type: 'ticket_delivery' as const, channel: 'email' as const,
        body: '<p>Halo <strong>{{name}}</strong>, berikut tiket Anda untuk <strong>{{event_title}}</strong> pada {{date}} di {{venue}}.</p><p>QR Tiket:</p>{{qr_code}}<p>Simpan email ini dan tunjukkan QR saat masuk acara.</p>',
        createdAt: now, updatedAt: now
      }
    ]
    for (const t of seeded) {
      this.templates.set(t.id, t)
    }
  }

  async create(data: Omit<Template, 'id' | 'createdAt' | 'updatedAt'>): Promise<Template> {
    const template: Template = {
      ...data,
      id: createId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    this.templates.set(template.id, template)
    return template
  }

  async findById(id: string): Promise<Template | null> {
    return this.templates.get(id) || null
  }

  async findAll(): Promise<Template[]> {
    return Array.from(this.templates.values())
  }

  async update(id: string, updates: Partial<Template>): Promise<Template | null> {
    const existing = this.templates.get(id)
    if (!existing) return null

    const updated: Template = {
      ...existing,
      ...updates,
      id: existing.id,
      updatedAt: new Date().toISOString()
    }
    this.templates.set(id, updated)
    return updated
  }

  async delete(id: string): Promise<boolean> {
    return this.templates.delete(id)
  }
}
