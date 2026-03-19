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

export const handlers = [
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
]
