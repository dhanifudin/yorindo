import { config } from './config/index.js'
import type { IAuditLogRepository } from './interfaces/repositories/IAuditLogRepository.js'
import type { IContactRepository } from './interfaces/repositories/IContactRepository.js'
import type { IEventRepository } from './interfaces/repositories/IEventRepository.js'
import type { IFlaggedRecordsRepository } from './interfaces/repositories/IFlaggedRecordsRepository.js'
import type { IRawUploadRepository } from './interfaces/repositories/IRawUploadRepository.js'
import type { IRegistrationRepository } from './interfaces/repositories/IRegistrationRepository.js'
import type { ISuppressionRepository } from './interfaces/repositories/ISuppressionRepository.js'
import type { ISurveyRepository } from './interfaces/repositories/ISurveyRepository.js'
import type { ITemplateRepository } from './interfaces/repositories/ITemplateRepository.js'
import type { IUserRepository } from './interfaces/repositories/IUserRepository.js'
import type { IVendorRepository } from './interfaces/repositories/IVendorRepository.js'
import type { IEventSponsorRepository } from './interfaces/repositories/IEventSponsorRepository.js'
import type { IBlastLogRecipientRepository } from './interfaces/repositories/IBlastLogRecipientRepository.js'
import type { IDeduplicationService } from './interfaces/services/IDeduplicationService.js'
import type { IEmailService } from './interfaces/services/IEmailService.js'
import type { IEtlNormalizationService } from './interfaces/services/IEtlNormalizationService.js'
import type { IOtpService } from './interfaces/services/IOtpService.js'
import type { IQueueService } from './interfaces/services/IQueueService.js'
import type { IWhatsAppService } from './interfaces/services/IWhatsAppService.js'
import type { IInsightsService } from './interfaces/services/IInsightsService.js'
import { InMemoryAuditLogRepository } from './repositories/memory/AuditLogRepository.js'
import { InMemoryContactRepository } from './repositories/memory/ContactRepository.js'
import { InMemoryEventRepository } from './repositories/memory/EventRepository.js'
import { InMemoryFlaggedRecordsRepository } from './repositories/memory/FlaggedRecordsRepository.js'
import { InMemoryRawUploadRepository } from './repositories/memory/RawUploadRepository.js'
import { InMemoryRegistrationRepository } from './repositories/memory/RegistrationRepository.js'
import { InMemorySuppressionRepository } from './repositories/memory/SuppressionRepository.js'
import { InMemorySurveyRepository } from './repositories/memory/SurveyRepository.js'
import { InMemoryUserRepository } from './repositories/memory/UserRepository.js'
import { InMemoryVendorRepository } from './repositories/memory/VendorRepository.js'
import { InMemoryEventSponsorRepository } from './repositories/memory/EventSponsorRepository.js'
import { InMemoryTemplateRepository } from './repositories/memory/TemplateRepository.js'
import { InMemoryBlastLogRecipientRepository } from './repositories/memory/BlastLogRecipientRepository.js'
import { getPool } from './repositories/postgres/pool.js'
import { PostgresContactRepository } from './repositories/postgres/ContactRepository.js'
import { PostgresEventRepository } from './repositories/postgres/EventRepository.js'
import { PostgresRegistrationRepository } from './repositories/postgres/RegistrationRepository.js'
import { PostgresUserRepository } from './repositories/postgres/UserRepository.js'
import { PostgresFlaggedRecordsRepository } from './repositories/postgres/FlaggedRecordsRepository.js'
import { PostgresRawUploadRepository } from './repositories/postgres/RawUploadRepository.js'
import { PostgresAuditLogRepository } from './repositories/postgres/AuditLogRepository.js'
import { PostgresSuppressionRepository } from './repositories/postgres/SuppressionRepository.js'
import { PostgresSurveyRepository } from './repositories/postgres/SurveyRepository.js'
import { PostgresVendorRepository } from './repositories/postgres/VendorRepository.js'
import { PostgresEventSponsorRepository } from './repositories/postgres/EventSponsorRepository.js'
import { PostgresTemplateRepository } from './repositories/postgres/TemplateRepository.js'
import { PostgresBlastLogRecipientRepository } from './repositories/postgres/BlastLogRecipientRepository.js'
import { NormalizationService } from './services/NormalizationService.js'
import { SmtpEmailService } from './services/adapters/real/SmtpEmailService.js'
import { getProviderConfig, clearProviderConfigCache } from './lib/email-provider-config.js'
import { FuzzyDeduplicationService } from './services/FuzzyDeduplicationService.js'
import { MockEmailService } from './services/adapters/mock/EmailService.js'
import { MockEtlNormalizationService } from './services/adapters/mock/EtlNormalizationService.js'
import { MockOtpService } from './services/adapters/mock/OtpService.js'
import { MockQueueService } from './services/adapters/mock/QueueService.js'
import { MockWhatsAppService } from './services/adapters/mock/WhatsAppService.js'
import { MockInsightsService } from './services/adapters/mock/MockInsightsService.js'
import { InsightsService } from './services/adapters/real/InsightsService.js'
import { BrevoEmailService } from './services/adapters/real/BrevoEmailService.js'
import { MailtrapEmailService } from './services/adapters/real/MailtrapEmailService.js'
import { BullQueueService } from './services/adapters/real/BullQueueService.js'
import { EverproWhatsAppService } from './services/adapters/real/EverproWhatsAppService.js'
import { OpenAiEtlNormalizationService } from './services/adapters/real/OpenAiEtlNormalizationService.js'
import { RuleBasedEtlNormalizationService } from './services/adapters/real/RuleBasedEtlNormalizationService.js'

function resolveRepositories(): {
  contactRepository: IContactRepository
  eventRepository: IEventRepository
  registrationRepository: IRegistrationRepository
  userRepository: IUserRepository
  surveyRepository: ISurveyRepository
  flaggedRecordsRepository: IFlaggedRecordsRepository
  suppressionRepository: ISuppressionRepository
  rawUploadRepository: IRawUploadRepository
  auditLogRepository: IAuditLogRepository
  vendorRepository: IVendorRepository
  eventSponsorRepository: IEventSponsorRepository
  templateRepository: ITemplateRepository
  blastLogRecipientRepository: IBlastLogRecipientRepository
} {
  if (config.repositoryImpl === 'memory') {
    return {
      contactRepository: new InMemoryContactRepository(),
      eventRepository: new InMemoryEventRepository(),
      registrationRepository: new InMemoryRegistrationRepository(),
      userRepository: new InMemoryUserRepository(),
      surveyRepository: new InMemorySurveyRepository(),
      flaggedRecordsRepository: new InMemoryFlaggedRecordsRepository(),
      suppressionRepository: new InMemorySuppressionRepository(),
      rawUploadRepository: new InMemoryRawUploadRepository(),
      auditLogRepository: new InMemoryAuditLogRepository(),
      vendorRepository: new InMemoryVendorRepository(),
      eventSponsorRepository: new InMemoryEventSponsorRepository(),
      templateRepository: new InMemoryTemplateRepository(),
      blastLogRecipientRepository: new InMemoryBlastLogRecipientRepository(),
    }
  }

  if (config.repositoryImpl === 'postgres') {
    const pool = getPool()
    return {
      contactRepository: new PostgresContactRepository(pool),
      eventRepository: new PostgresEventRepository(pool),
      registrationRepository: new PostgresRegistrationRepository(pool),
      userRepository: new PostgresUserRepository(pool),
      surveyRepository: new PostgresSurveyRepository(pool),
      flaggedRecordsRepository: new PostgresFlaggedRecordsRepository(pool),
      suppressionRepository: new PostgresSuppressionRepository(pool),
      rawUploadRepository: new PostgresRawUploadRepository(pool),
      auditLogRepository: new PostgresAuditLogRepository(pool),
      vendorRepository: new PostgresVendorRepository(pool),
      eventSponsorRepository: new PostgresEventSponsorRepository(pool),
      templateRepository: new PostgresTemplateRepository(pool),
      blastLogRecipientRepository: new PostgresBlastLogRecipientRepository(pool),
    }
  }

  throw new Error(`Unknown REPOSITORY_IMPL: ${config.repositoryImpl}`)
}

const repos = resolveRepositories()

function resolveEtlNormalizationService(): IEtlNormalizationService {
  switch (config.etlAiProvider) {
    case 'disabled':
      return new RuleBasedEtlNormalizationService()
    case 'mock':
      return new MockEtlNormalizationService()
    case 'openai':
      return new OpenAiEtlNormalizationService()
    default:
      return new MockEtlNormalizationService()
  }
}

async function resolveEmailService(): Promise<IEmailService> {
  try {
    const emailConfig = await getProviderConfig()
    switch (emailConfig.provider) {
      case 'brevo':
        return new BrevoEmailService()
      case 'smtp':
        return new SmtpEmailService()
      default:
        return new MockEmailService()
    }
  } catch {
    // Fallback to env-var based resolution if DB is unavailable
    switch (config.emailProvider) {
      case 'brevo':
        return new BrevoEmailService()
      case 'mailtrap':
        return new MailtrapEmailService()
      default:
        return new MockEmailService()
    }
  }
}

function resolveInsightsService(): IInsightsService {
  // Always use InsightsService which reads AI provider settings from database
  // This allows admin to configure AI provider (openai, groq, mock, disabled) from /app/settings
  return new InsightsService()
}

async function resolveServices(): Promise<{
  emailService: IEmailService
  whatsAppService: IWhatsAppService
  etlNormalizationService: IEtlNormalizationService
  insightsService: IInsightsService
  queueService: IQueueService
  otpService: IOtpService
  deduplicationService: IDeduplicationService
}> {
  const queueService = config.nodeEnv === 'test' || !config.redisUrl
    ? new MockQueueService()
    : new BullQueueService()
  const etlNormalizationService = resolveEtlNormalizationService()
  const insightsService = resolveInsightsService()
  const deduplicationService = new FuzzyDeduplicationService(repos.contactRepository)

  const emailService = await resolveEmailService()

  if (config.serviceImpl === 'mock') {
    return {
      emailService,
      whatsAppService: new MockWhatsAppService(),
      etlNormalizationService,
      insightsService,
      queueService,
      otpService: new MockOtpService(),
      deduplicationService,
    }
  }

  if (config.serviceImpl === 'real') {
    return {
      emailService,
      whatsAppService: new EverproWhatsAppService(),
      etlNormalizationService,
      insightsService,
      queueService,
      otpService: new MockOtpService(),
      deduplicationService,
    }
  }

  throw new Error(`Unknown SERVICE_IMPL: ${config.serviceImpl}`)
}

const svcs = await resolveServices()

export const contactRepository: IContactRepository = repos.contactRepository
export const eventRepository: IEventRepository = repos.eventRepository
export const registrationRepository: IRegistrationRepository = repos.registrationRepository
export const userRepository: IUserRepository = repos.userRepository
export const surveyRepository: ISurveyRepository = repos.surveyRepository
export const flaggedRecordsRepository: IFlaggedRecordsRepository = repos.flaggedRecordsRepository
export const suppressionRepository: ISuppressionRepository = repos.suppressionRepository
export const rawUploadRepository: IRawUploadRepository = repos.rawUploadRepository
export const auditLogRepository: IAuditLogRepository = repos.auditLogRepository
export const vendorRepository: IVendorRepository = repos.vendorRepository
export const eventSponsorRepository: IEventSponsorRepository = repos.eventSponsorRepository
export const templateRepository: ITemplateRepository = repos.templateRepository
export const blastLogRecipientRepository: IBlastLogRecipientRepository = repos.blastLogRecipientRepository

export const emailService: IEmailService = svcs.emailService
export const whatsAppService: IWhatsAppService = svcs.whatsAppService
export const etlNormalizationService: IEtlNormalizationService = svcs.etlNormalizationService
export const insightsService: IInsightsService = svcs.insightsService
export const queueService: IQueueService = svcs.queueService
export const otpService: IOtpService = svcs.otpService
export const deduplicationService: IDeduplicationService = svcs.deduplicationService

let _normalizationService: NormalizationService | null = null
export function getNormalizationService(): NormalizationService {
  if (!_normalizationService) {
    // Only create if database URL is configured (skip in test/memory mode)
    if (!process.env.DATABASE_URL && !process.env.POSTGRES_HOST) {
      throw new Error('NormalizationService requires DATABASE_URL or POSTGRES_HOST')
    }
    _normalizationService = new NormalizationService(getPool())
  }
  return _normalizationService
}

// Re-export for settings route cache invalidation
export { clearProviderConfigCache }

export const _repositoryImpl = config.repositoryImpl
export const _serviceImpl = config.serviceImpl
