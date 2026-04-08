import type { IEmailService, EmailPayload } from '../../../interfaces/services/IEmailService.js'
import { config } from '../../../config/index.js'
import { logEmailDelivery } from '../../../lib/email-delivery-logger.js'
import nodemailer from 'nodemailer'

export class MailtrapEmailService implements IEmailService {
  private transporter = nodemailer.createTransport({
    host: config.mailtrapHost,
    port: config.mailtrapPort,
    secure: config.mailtrapPort === 465, // true for 465, false for other ports
    auth: {
      user: config.mailtrapUser,
      pass: config.mailtrapPass,
    },
  })

  async send(payload: EmailPayload): Promise<{ messageId: string }> {
    try {
      const info = await this.transporter.sendMail({
        from: { name: 'Yorindo', address: config.brevoSenderEmail ?? 'noreply@yorindo.app' },
        to: payload.to,
        subject: payload.subject,
        html: payload.body,
      })

      const messageId = info.messageId ?? `mailtrap-${Date.now()}`
      logEmailDelivery({ messageId, to: payload.to, subject: payload.subject, status: 'sent', provider: 'mailtrap' })
      return { messageId }
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err)
      logEmailDelivery({ messageId: 'unknown', to: payload.to, subject: payload.subject, status: 'failed', error, provider: 'mailtrap' })
      throw new Error(`Mailtrap SMTP error: ${error}`)
    }
  }

  async sendBatch(payloads: EmailPayload[]): Promise<{ sent: number; failed: number }> {
    let sent = 0
    let failed = 0
    for (const payload of payloads) {
      try {
        await this.send(payload)
        sent++
      } catch (err) {
        failed++
      }
    }
    return { sent, failed }
  }
}
