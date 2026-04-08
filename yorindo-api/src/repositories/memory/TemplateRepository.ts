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
    // All 10 templates: 5 types × 2 channels
    const seeded = [
      // ── Invitation ──
      {
        id: 'tmpl-001', name: 'Undangan Event (WhatsApp)', type: 'invitation' as const, channel: 'whatsapp' as const,
        body: 'Halo *{{name}}*, Anda diundang ke *{{event_title}}* pada _{{date}}_ di {{venue}}.\n\nSegera daftarkan diri Anda!',
        createdAt: now, updatedAt: now
      },
      {
        id: 'tmpl-002', name: 'Undangan Event (Email)', type: 'invitation' as const, channel: 'email' as const,
        body: '<p>Halo <strong>{{name}}</strong>,</p><p>Anda diundang ke <strong>{{event_title}}</strong> pada {{date}} di {{venue}}.</p>',
        createdAt: now, updatedAt: now
      },

      // ── Confirmation ──
      {
        id: 'tmpl-003', name: 'Konfirmasi Tiket (WhatsApp)', type: 'confirmation' as const, channel: 'whatsapp' as const,
        body: 'Selamat *{{name}}*! Registrasi Anda untuk *{{event_title}}* telah disetujui.',
        createdAt: now, updatedAt: now
      },
      {
        id: 'tmpl-004', name: 'Konfirmasi Tiket (Email)', type: 'confirmation' as const, channel: 'email' as const,
        body: '<p>Selamat <strong>{{name}}</strong>! Registrasi Anda untuk <strong>{{event_title}}</strong> telah disetujui.</p>',
        createdAt: now, updatedAt: now
      },

      // ── Rejection ──
      {
        id: 'tmpl-005', name: 'Penolakan (WhatsApp)', type: 'rejection' as const, channel: 'whatsapp' as const,
        body: 'Maaf {{name}}, registrasi Anda untuk {{event_title}} tidak dapat kami terima.',
        createdAt: now, updatedAt: now
      },
      {
        id: 'tmpl-006', name: 'Penolakan (Email)', type: 'rejection' as const, channel: 'email' as const,
        body: '<p>Maaf <strong>{{name}}</strong>, registrasi Anda untuk <strong>{{event_title}}</strong> tidak dapat kami terima.</p>',
        createdAt: now, updatedAt: now
      },

      // ── Ticket Delivery ──
      {
        id: 'tmpl-007', name: 'Pengiriman Tiket (WhatsApp)', type: 'ticket_delivery' as const, channel: 'whatsapp' as const,
        body: 'Berikut tiket Anda untuk {{event_title}}. Token: {{token}}',
        createdAt: now, updatedAt: now
      },
      {
        id: 'tmpl-008', name: 'Pengiriman Tiket (Email)', type: 'ticket_delivery' as const, channel: 'email' as const,
        body: '<p>Halo <strong>{{name}}</strong>, berikut tiket Anda untuk <strong>{{event_title}}</strong>.</p><p>Token: {{token}}</p>',
        createdAt: now, updatedAt: now
      },

      // ── Cancellation ──
      {
        id: 'tmpl-009', name: 'Pembatalan Event (WhatsApp)', type: 'cancellation' as const, channel: 'whatsapp' as const,
        body: 'Maaf {{name}}, event {{event_title}} pada {{date}} dibatalkan.',
        createdAt: now, updatedAt: now
      },
      {
        id: 'tmpl-010', name: 'Pembatalan Event (Email)', type: 'cancellation' as const, channel: 'email' as const,
        body: '<p>Maaf <strong>{{name}}</strong>, event <strong>{{event_title}}</strong> pada {{date}} telah dibatalkan.</p>',
        createdAt: now, updatedAt: now
      },

      // ── Reminder ──
      {
        id: 'tmpl-011', name: 'Pengingat Event (WhatsApp)', type: 'reminder' as const, channel: 'whatsapp' as const,
        body: 'Halo {{name}}, event {{event_title}} tinggal {{days}} hari lagi! Jangan lupa untuk hadir.',
        createdAt: now, updatedAt: now
      },
      {
        id: 'tmpl-012', name: 'Pengingat Event (Email)', type: 'reminder' as const, channel: 'email' as const,
        body: '<p>Halo <strong>{{name}}</strong>, event <strong>{{event_title}}</strong> tinggal {{days}} hari lagi. Kami menantikan kehadiran Anda.</p>',
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
