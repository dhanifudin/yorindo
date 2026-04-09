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
import type { IDeduplicationService } from './interfaces/services/IDeduplicationService.js'
import type { IEmailService } from './interfaces/services/IEmailService.js'
import type { IEtlNormalizationService } from './interfaces/services/IEtlNormalizationService.js'
import type { IOtpService } from './interfaces/services/IOtpService.js'
import type { IQueueService } from './interfaces/services/IQueueService.js'
import type { IWhatsAppService } from './interfaces/services/IWhatsAppService.js'
import type { IYoriMindService } from './interfaces/services/IYoriMindService.js'
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
import { FuzzyDeduplicationService } from './services/FuzzyDeduplicationService.js'
import { MockEmailService } from './services/adapters/mock/EmailService.js'
import { MockEtlNormalizationService } from './services/adapters/mock/EtlNormalizationService.js'
import { MockOtpService } from './services/adapters/mock/OtpService.js'
import { MockQueueService } from './services/adapters/mock/QueueService.js'
import { MockWhatsAppService } from './services/adapters/mock/WhatsAppService.js'
import { MockYoriMindService } from './services/adapters/mock/YoriMindService.js'
import { DisabledYoriMindService } from './services/adapters/disabled/YoriMindService.js'
import { OpenAiProxyYoriMindService } from './services/adapters/real/OpenAiProxyYoriMindService.js'
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

function resolveEmailService(): IEmailService {
  switch (config.emailProvider) {
    case 'brevo':
      return new BrevoEmailService()
    case 'mailtrap':
      return new MailtrapEmailService()
    default:
      return new MockEmailService()
  }
}

function resolveYoriMindService(): IYoriMindService {
  switch (config.yorimindAiProvider) {
    case 'disabled':
      return new DisabledYoriMindService()
    case 'openai-proxy':
      return new OpenAiProxyYoriMindService()
    case 'mock':
    default:
      return new MockYoriMindService()
  }
}

function resolveServices(): {
  emailService: IEmailService
  whatsAppService: IWhatsAppService
  etlNormalizationService: IEtlNormalizationService
  yoriMindService: IYoriMindService
  queueService: IQueueService
  otpService: IOtpService
  deduplicationService: IDeduplicationService
} {
  const queueService = config.nodeEnv === 'test' || !config.redisUrl
    ? new MockQueueService()
    : new BullQueueService()
  const etlNormalizationService = resolveEtlNormalizationService()
  const yoriMindService = resolveYoriMindService()
  const deduplicationService = new FuzzyDeduplicationService(repos.contactRepository)

  const emailService = resolveEmailService()

  if (config.serviceImpl === 'mock') {
    return {
      emailService,
      whatsAppService: new MockWhatsAppService(),
      etlNormalizationService,
      yoriMindService,
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
      yoriMindService,
      queueService,
      otpService: new MockOtpService(),
      deduplicationService,
    }
  }

  throw new Error(`Unknown SERVICE_IMPL: ${config.serviceImpl}`)
}

const svcs = resolveServices()

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

export const emailService: IEmailService = svcs.emailService
export const whatsAppService: IWhatsAppService = svcs.whatsAppService
export const etlNormalizationService: IEtlNormalizationService = svcs.etlNormalizationService
export const yoriMindService: IYoriMindService = svcs.yoriMindService
export const queueService: IQueueService = svcs.queueService
export const otpService: IOtpService = svcs.otpService
export const deduplicationService: IDeduplicationService = svcs.deduplicationService

export const _repositoryImpl = config.repositoryImpl
export const _serviceImpl = config.serviceImpl
