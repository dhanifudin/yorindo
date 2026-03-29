/**
 * Dependency Injection Container
 *
 * Resolves repository and service implementations from env vars.
 * Phase 1 (default): in-memory repositories + mock service adapters.
 * Phase 2: swap to real implementations by setting REPOSITORY_IMPL=postgres,
 *          SERVICE_IMPL=real, and the appropriate AI provider env vars.
 *
 * All exports are typed to their interface — never to their concrete class.
 * Route handlers and services import only interface types from here.
 */

import { config } from './config/index.js'

// ─── Repository interface types ───────────────────────────────────────────────
import type { IContactRepository } from './interfaces/repositories/IContactRepository.js'
import type { IEventRepository } from './interfaces/repositories/IEventRepository.js'
import type { IRegistrationRepository } from './interfaces/repositories/IRegistrationRepository.js'
import type { IUserRepository } from './interfaces/repositories/IUserRepository.js'
import type { ISurveyRepository } from './interfaces/repositories/ISurveyRepository.js'
import type { IFlaggedRecordsRepository } from './interfaces/repositories/IFlaggedRecordsRepository.js'
import type { ISuppressionRepository } from './interfaces/repositories/ISuppressionRepository.js'
import type { IRawUploadRepository } from './interfaces/repositories/IRawUploadRepository.js'
import type { IAuditLogRepository } from './interfaces/repositories/IAuditLogRepository.js'

// ─── Service interface types ──────────────────────────────────────────────────
import type { IEmailService } from './interfaces/services/IEmailService.js'
import type { IWhatsAppService } from './interfaces/services/IWhatsAppService.js'
import type { IEtlNormalizationService } from './interfaces/services/IEtlNormalizationService.js'
import type { IYoriMindService } from './interfaces/services/IYoriMindService.js'
import type { IQueueService } from './interfaces/services/IQueueService.js'
import type { IOtpService } from './interfaces/services/IOtpService.js'

// ─── In-memory repository implementations (Phase 1) ──────────────────────────
import { InMemoryContactRepository } from './repositories/memory/ContactRepository.js'
import { InMemoryEventRepository } from './repositories/memory/EventRepository.js'
import { InMemoryRegistrationRepository } from './repositories/memory/RegistrationRepository.js'
import { InMemoryUserRepository } from './repositories/memory/UserRepository.js'
import { InMemorySurveyRepository } from './repositories/memory/SurveyRepository.js'
import { InMemoryFlaggedRecordsRepository } from './repositories/memory/FlaggedRecordsRepository.js'
import { InMemorySuppressionRepository } from './repositories/memory/SuppressionRepository.js'
import { InMemoryRawUploadRepository } from './repositories/memory/RawUploadRepository.js'
import { InMemoryAuditLogRepository } from './repositories/memory/AuditLogRepository.js'

// ─── Mock service adapters (Phase 1) ─────────────────────────────────────────
import { MockEmailService } from './services/adapters/mock/EmailService.js'
import { MockWhatsAppService } from './services/adapters/mock/WhatsAppService.js'
import { MockEtlNormalizationService } from './services/adapters/mock/EtlNormalizationService.js'
import { MockYoriMindService } from './services/adapters/mock/YoriMindService.js'
import { MockQueueService } from './services/adapters/mock/QueueService.js'
import { MockOtpService } from './services/adapters/mock/OtpService.js'

// ─── Real service adapters (Phase 2) — imported statically to avoid ESM require() ──
import { BrevoEmailService } from './services/adapters/real/BrevoEmailService.js'
import { EverproWhatsAppService } from './services/adapters/real/EverproWhatsAppService.js'
import { OpenAiEtlNormalizationService } from './services/adapters/real/OpenAiEtlNormalizationService.js'
import { BullQueueService } from './services/adapters/real/BullQueueService.js'

// ─── Repository factory ───────────────────────────────────────────────────────

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
    }
  }
  if (config.repositoryImpl === 'postgres') {
    throw new Error('Postgres repositories not yet implemented — run Phase 2 setup')
  }
  throw new Error(`Unknown REPOSITORY_IMPL: ${config.repositoryImpl}`)
}

// ─── Service factory ──────────────────────────────────────────────────────────

function resolveServices(): {
  emailService: IEmailService
  whatsAppService: IWhatsAppService
  etlNormalizationService: IEtlNormalizationService
  yoriMindService: IYoriMindService
  queueService: IQueueService
  otpService: IOtpService
} {
  if (config.serviceImpl === 'mock') {
    return {
      emailService: new MockEmailService(),
      whatsAppService: new MockWhatsAppService(),
      etlNormalizationService: new MockEtlNormalizationService(),
      yoriMindService: new MockYoriMindService(),
      queueService: new MockQueueService(),
      otpService: new MockOtpService(),
    }
  }
  if (config.serviceImpl === 'real') {
    return {
      emailService: new BrevoEmailService(),
      whatsAppService: new EverproWhatsAppService(),
      etlNormalizationService: new OpenAiEtlNormalizationService(),
      yoriMindService: new MockYoriMindService(),   // YoriMind real adapter: Story 8.4
      queueService: new BullQueueService(),
      otpService: new MockOtpService(),              // OTP real adapter: Epic 7 Phase 2
    }
  }
  throw new Error(`Unknown SERVICE_IMPL: ${config.serviceImpl}`)
}

// ─── Singleton container (resolved once at startup) ───────────────────────────

const repos = resolveRepositories()
const svcs = resolveServices()

// ─── Repository exports (typed to interface, never to concrete class) ─────────

export const contactRepository: IContactRepository = repos.contactRepository
export const eventRepository: IEventRepository = repos.eventRepository
export const registrationRepository: IRegistrationRepository = repos.registrationRepository
export const userRepository: IUserRepository = repos.userRepository
export const surveyRepository: ISurveyRepository = repos.surveyRepository
export const flaggedRecordsRepository: IFlaggedRecordsRepository = repos.flaggedRecordsRepository
export const suppressionRepository: ISuppressionRepository = repos.suppressionRepository
export const rawUploadRepository: IRawUploadRepository = repos.rawUploadRepository
export const auditLogRepository: IAuditLogRepository = repos.auditLogRepository

// ─── Service exports (typed to interface, never to concrete class) ─────────────

export const emailService: IEmailService = svcs.emailService
export const whatsAppService: IWhatsAppService = svcs.whatsAppService
export const etlNormalizationService: IEtlNormalizationService = svcs.etlNormalizationService
export const yoriMindService: IYoriMindService = svcs.yoriMindService
export const queueService: IQueueService = svcs.queueService
export const otpService: IOtpService = svcs.otpService

export const _repositoryImpl = config.repositoryImpl
export const _serviceImpl = config.serviceImpl
