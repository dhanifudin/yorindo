import { contactHandlers } from './contacts'
import { eventHandlers } from './events'
import { registrationHandlers } from './registrations'
import { authHandlers } from './auth'
import { scanHandlers } from './scan'
import { insightsHandlers } from './yorimind'
import { templateHandlers } from './templates'
import { reportHandlers } from './reports'
import { dataRightsHandlers } from './dataRights'
import { userHandlers } from './users'
import { importHandlers } from './etl'
import { blastHandlers } from './blast'
import { vendorHandlers } from './vendors'
import { uploadHandlers } from './uploads'
import { locationHandlers } from './locations'
import { surveysHandlers } from './surveys'

export const handlers = [
  ...locationHandlers,  // before others — /api/locations/* must be caught early
  ...blastHandlers,  // before eventHandlers — /api/blast/* must not be caught by event wildcard
  ...contactHandlers,
  ...eventHandlers,
  ...surveysHandlers,
  ...registrationHandlers,
  ...authHandlers,
  ...scanHandlers,
  ...insightsHandlers,
  ...templateHandlers,
  ...reportHandlers,
  ...dataRightsHandlers,
  ...userHandlers,
  ...importHandlers,
  ...vendorHandlers,
  ...uploadHandlers,
]
