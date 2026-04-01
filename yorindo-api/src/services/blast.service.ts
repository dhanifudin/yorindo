import type { IEmailService } from '../interfaces/services/IEmailService.js'
import type { IWhatsAppService } from '../interfaces/services/IWhatsAppService.js'
import type { ISuppressionRepository } from '../interfaces/repositories/ISuppressionRepository.js'
import type { IContactRepository } from '../interfaces/repositories/IContactRepository.js'
import type { IEventRepository } from '../interfaces/repositories/IEventRepository.js'

export interface BlastJobData {
  eventId: string
  channel: 'email' | 'whatsapp'
  templateId: string
  templateBody: string
  templateName: string
  customMessage?: string
  filters?: {
    industry?: string
    city?: string
    jobTitle?: string
  }
  scheduledAt?: string
  enqueuedBy: string
}

export interface BlastJobResult {
  recipientCount: number
  suppressedCount: number
  sentCount: number
  failedCount: number
  failureRate: number
}

export interface AuditEntry {
  action: string
  metadata: Record<string, unknown>
  level: 'info' | 'warning' | 'error'
}

export interface IAuditLogger {
  log(entry: AuditEntry): Promise<void>
}

function substituteVariables(template: string, data: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] ?? `{{${key}}}`)
}

export class BlastService {
  constructor(
    private readonly emailService: IEmailService,
    private readonly whatsAppService: IWhatsAppService,
    private readonly suppressionRepository: ISuppressionRepository,
    private readonly contactRepository: IContactRepository,
    private readonly eventRepository: IEventRepository,
    private readonly auditLogger: IAuditLogger,
  ) {}

  async processJob(job: BlastJobData): Promise<BlastJobResult> {
    // Load event for template variable substitution
    const event = await this.eventRepository.findById(job.eventId)
    const eventVars = {
      event_title: event?.name ?? job.eventId,
      date: event?.date ?? '',
      venue: event?.city ?? '',
    }

    // Load contacts (simplified: get all contacts in Phase 1 — real impl would filter by targetCriteria)
    const { data: contacts } = await this.contactRepository.findAll({
      page: 1,
      pageSize: 500,
    })

    let suppressedCount = 0
    let sentCount = 0
    let failedCount = 0
    const failures: Array<{ contactId: string; error: string }> = []

    for (const contact of contacts) {
      // Suppression check
      const isSuppressed = await this.suppressionRepository.isSuppressed(contact.phone)
      if (isSuppressed) {
        suppressedCount++
        continue
      }

      const variables = {
        name: contact.name,
        ...eventVars,
      }
      const personalizedBody = substituteVariables(job.templateBody, variables)

      try {
        if (job.channel === 'email') {
          if (!contact.email) { failedCount++; continue }
          await this.emailService.send({
            to: contact.email,
            subject: `Undangan: ${eventVars.event_title}`,
            body: personalizedBody,
            variables,
          })
        } else {
          await this.whatsAppService.send({
            to: contact.phone,
            templateName: job.templateName,
            body: personalizedBody,
            variables,
          })
        }
        sentCount++
      } catch (err) {
        failedCount++
        failures.push({
          contactId: contact.id,
          error: err instanceof Error ? err.message : String(err),
        })
        await this.auditLogger.log({
          action: 'blast.delivery-failed',
          metadata: {
            eventId: job.eventId,
            contactId: contact.id,
            channel: job.channel,
            error: err instanceof Error ? err.message : String(err),
          },
          level: 'error',
        })
      }
    }

    const recipientCount = contacts.length - suppressedCount
    const failureRate = recipientCount > 0 ? failedCount / recipientCount : 0

    // Audit: blast initiated
    await this.auditLogger.log({
      action: 'blast.initiated',
      metadata: {
        eventId: job.eventId,
        channel: job.channel,
        recipientCount,
        suppressedCount,
        sentCount,
        failedCount,
        enqueuedBy: job.enqueuedBy,
      },
      level: 'info',
    })

    // High failure rate alert
    if (failureRate > 0.05) {
      await this.auditLogger.log({
        action: 'blast.high-failure-rate',
        metadata: {
          eventId: job.eventId,
          failureRate: Math.round(failureRate * 100),
          failedCount,
          recipientCount,
        },
        level: 'warning',
      })
    }

    return { recipientCount, suppressedCount, sentCount, failedCount, failureRate }
  }
}
