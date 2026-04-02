import { contactHandlers } from './contacts'
import { eventHandlers } from './events'
import { registrationHandlers } from './registrations'
import { authHandlers } from './auth'
import { scanHandlers } from './scan'
import { yorimindHandlers } from './yorimind'
import { templateHandlers } from './templates'
import { reportHandlers } from './reports'
import { dataRightsHandlers } from './dataRights'
import { userHandlers } from './users'
import { etlHandlers } from './etl'
import { blastHandlers } from './blast'
import { vendorHandlers } from './vendors'
import { uploadHandlers } from './uploads'

export const handlers = [
  ...blastHandlers,  // before eventHandlers — /api/blast/* must not be caught by event wildcard
  ...contactHandlers,
  ...eventHandlers,
  ...registrationHandlers,
  ...authHandlers,
  ...scanHandlers,
  ...yorimindHandlers,
  ...templateHandlers,
  ...reportHandlers,
  ...dataRightsHandlers,
  ...userHandlers,
  ...etlHandlers,
  ...vendorHandlers,
  ...uploadHandlers,
]
