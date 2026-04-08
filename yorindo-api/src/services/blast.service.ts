import type { IAuditLogRepository } from '../interfaces/repositories/IAuditLogRepository.js'
import type { IContactRepository } from '../interfaces/repositories/IContactRepository.js'
import type { IEventRepository } from '../interfaces/repositories/IEventRepository.js'
import type { ISuppressionRepository } from '../interfaces/repositories/ISuppressionRepository.js'
import type { IEmailService } from '../interfaces/services/IEmailService.js'
import type { IWhatsAppService } from '../interfaces/services/IWhatsAppService.js'
import { findTemplateById } from '../data/templates.js'
import type { Contact } from '../types/domain.js'

export interface BlastJobData {
  eventId: string
  channel: 'email' | 'whatsapp'
  templateId: string
  templateBody: string
  templateName: string
  customMessage?: string
  filters?: {
    industries?: string[]
    cities?: string[]
    companySizes?: string[]
    jobTitles?: string[]
    behavior?: string[]
    lastAttendedBefore?: string
  }
  contactIds?: string[]
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

export interface DeliveryFailure {
  contactId: string
  error: string
}

function substituteVariables(template: string, data: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] ?? `{{${key}}}`)
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export class BlastService {
  constructor(
    private readonly emailService: IEmailService,
    private readonly whatsAppService: IWhatsAppService,
    private readonly suppressionRepository: ISuppressionRepository,
    private readonly contactRepository: IContactRepository,
    private readonly eventRepository: IEventRepository,
    private readonly auditLogRepository: IAuditLogRepository,
    private readonly sleep: (ms: number) => Promise<void> = wait,
  ) { }

  private async resolveRecipients(job: BlastJobData): Promise<Contact[]> {
    if (job.contactIds?.length) {
      const contacts = await Promise.all(job.contactIds.map((contactId) => this.contactRepository.findById(contactId)))
      return contacts.filter((contact): contact is Contact => contact !== null)
    }

    const filters: { industry?: string; city?: string; companySize?: string } = {}
    if (job.filters?.industries?.[0]) filters.industry = job.filters.industries[0]
    if (job.filters?.cities?.[0]) filters.city = job.filters.cities[0]
    if (job.filters?.companySizes?.[0]) filters.companySize = job.filters.companySizes[0]

    const { data } = await this.contactRepository.findAll(
      { page: 1, pageSize: 1000 },
      filters,
    )
    return data
  }

  private async isSuppressed(contact: Contact): Promise<boolean> {
    if (contact.consentStatus === 'suppressed') return true
    return this.suppressionRepository.isSuppressed({ phone: contact.phone, email: contact.email })
  }

  private async writeAuditLog(
    action: string,
    actorRole: string,
    job: BlastJobData,
    metadata: Record<string, unknown>,
    targetId: string | null,
    targetType: string | null,
  ): Promise<void> {
    await this.auditLogRepository.create({
      action,
      actorId: job.enqueuedBy,
      actorRole,
      eventId: job.eventId,
      targetId,
      targetType,
      metadata,
    })
  }

  private async sendWithRetry(
    job: BlastJobData,
    contact: Contact,
    send: () => Promise<void>,
  ): Promise<DeliveryFailure | null> {
    const retryDelays = [0, 2000, 4000, 8000]

    for (let attempt = 0; attempt < retryDelays.length; attempt++) {
      try {
        if (attempt > 0) {
          await this.sleep(retryDelays[attempt]!)
        }
        await send()
        return null
      } catch (error) {
        if (attempt === retryDelays.length - 1) {
          const reason = error instanceof Error ? error.message : String(error)
          await this.writeAuditLog(
            'blast.delivery-failed',
            'system-error',
            job,
            {
              channel: job.channel,
              contactId: contact.id,
              attempts: retryDelays.length,
              error: reason,
              deadLettered: true,
            },
            contact.id,
            'contact',
          )
          return {
            contactId: contact.id,
            error: reason,
          }
        }
      }
    }

    return {
      contactId: contact.id,
      error: 'Unknown delivery failure',
    }
  }

  async processJob(job: BlastJobData): Promise<BlastJobResult> {
    // Support both template lookup and custom template body
    let template
    if (job.templateId === 'custom' || job.templateId === 'contacts-blast') {
      // Use custom template body from job data
      template = {
        id: job.templateId,
        name: job.templateName,
        type: 'invitation' as const,
        channel: job.channel,
        body: job.templateBody,
        createdAt: new Date().toISOString(),
      }
    } else {
      template = findTemplateById(job.templateId)
      if (!template) {
        throw new Error(`Template not found: ${job.templateId}`)
      }
    }

    const event = await this.eventRepository.findById(job.eventId)
    const eventVars = {
      event_title: event?.name ?? job.eventId,
      date: event?.startDate ?? '',
      venue: event?.city ?? '',
    }

    // Load contacts based on job filters or direct contactIds
    let contacts: Contact[]
    if (job.contactIds && job.contactIds.length > 0) {
      // Load specific contacts by IDs
      const loaded = await Promise.all(job.contactIds.map((contactId) => this.contactRepository.findById(contactId)))
      contacts = loaded.filter((contact): contact is Contact => contact !== null)
    } else {
      // Load contacts based on filters
      const result = await this.contactRepository.findAll(
        { page: 1, pageSize: 1000 },
        job.filters,
      )
      contacts = result.data
    }

    let suppressedCount = 0
    let sentCount = 0
    let failedCount = 0
    const failures: DeliveryFailure[] = []

    for (const contact of contacts) {
      // Suppression check
      const isSuppressed = await this.suppressionRepository.isSuppressed({
        phone: contact.phone,
        email: contact.email,
      })
      if (isSuppressed) {
        suppressedCount++
        continue
      }

      const variables = {
        name: contact.name,
        ...eventVars,
      }
      const personalizedBody = substituteVariables(template.body, variables)

      if (job.channel === 'email' && !contact.email) {
        failedCount++
        failures.push({ contactId: contact.id, error: 'Missing email address' })
        await this.writeAuditLog(
          'blast.delivery-failed',
          'system-error',
          job,
          {
            channel: job.channel,
            contactId: contact.id,
            attempts: 0,
            error: 'Missing email address',
            deadLettered: true,
          },
          contact.id,
          'contact',
        )
        continue
      }

      const failure = await this.sendWithRetry(job, contact, async () => {
        if (job.channel === 'email') {
          await this.emailService.send({
            to: contact.email ?? '',
            subject: `Undangan: ${eventVars.event_title}`,
            body: personalizedBody,
            templateId: template.id,
            variables,
          })
          return
        }

        await this.whatsAppService.send({
          to: contact.phone ?? '',
          templateName: template.name,
          body: personalizedBody,
          variables,
        })
      })

      if (failure) {
        failedCount++
        failures.push(failure)
      } else {
        sentCount++
      }
    }

    const recipientCount = contacts.length - suppressedCount
    const failureRate = recipientCount > 0 ? failedCount / recipientCount : 0

    await this.writeAuditLog(
      'blast.initiated',
      'system',
      job,
      {
        channel: job.channel,
        templateId: template.id,
        recipientCount,
        suppressedCount,
        sentCount,
        failedCount,
        failures,
      },
      job.eventId,
      'event',
    )

    if (failureRate > 0.05) {
      await this.writeAuditLog(
        'blast.high-failure-rate',
        'system',
        job,
        {
          channel: job.channel,
          failedCount,
          recipientCount,
          failureRate: Math.round(failureRate * 100),
        },
        job.eventId,
        'event',
      )
    }

    return { recipientCount, suppressedCount, sentCount, failedCount, failureRate }
  }
}
