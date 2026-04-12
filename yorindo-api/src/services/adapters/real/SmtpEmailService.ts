/**
 * Generic SMTP Email Service
 *
 * Uses nodemailer with configurable SMTP settings.
 * Supports Gmail, Mailtrap, AWS SES, SendGrid, or any custom SMTP server.
 * Credentials resolved from SettingsService at runtime.
 */
import type { IEmailService, EmailPayload } from '../../../interfaces/services/IEmailService.js'
import { getProviderConfig } from '../../../lib/email-provider-config.js'
import { logEmailDelivery } from '../../../lib/email-delivery-logger.js'
import nodemailer from 'nodemailer'

export class SmtpEmailService implements IEmailService {
  private _transporter: nodemailer.Transporter | null = null
  private _lastConfigKey: string | null = null

  private async getTransporter(): Promise<nodemailer.Transporter> {
    const config = await getProviderConfig()
    const configKey = `${config.smtpHost}:${config.smtpPort}:${config.smtpUser}`

    // Reuse transporter if config hasn't changed
    if (this._transporter && this._lastConfigKey === configKey) {
      return this._transporter
    }

    const transportConfig = {
      host: config.smtpHost ?? undefined,
      port: config.smtpPort,
      secure: config.smtpSecure,
      auth: config.smtpUser && config.smtpPass
        ? { user: config.smtpUser, pass: config.smtpPass }
        : undefined,
    }

    this._transporter = nodemailer.createTransport(transportConfig)
    this._lastConfigKey = configKey
    return this._transporter
  }

  async send(payload: EmailPayload): Promise<{ messageId: string }> {
    try {
      const config = await getProviderConfig()
      const transporter = await this.getTransporter()

      const info = await transporter.sendMail({
        from: { name: config.senderName ?? 'EM . U', address: config.senderEmail ?? 'noreply@yorindo.app' },
        to: payload.to,
        subject: payload.subject,
        html: payload.body,
      })

      const messageId = info.messageId ?? `smtp-${Date.now()}`
      logEmailDelivery({ messageId, to: payload.to, subject: payload.subject, status: 'sent', provider: 'smtp' })
      return { messageId }
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err)
      logEmailDelivery({ messageId: 'unknown', to: payload.to, subject: payload.subject, status: 'failed', error, provider: 'smtp' })
      throw new Error(`SMTP error: ${error}`)
    }
  }

  async sendBatch(payloads: EmailPayload[]): Promise<{ sent: number; failed: number }> {
    let sent = 0
    let failed = 0
    for (const payload of payloads) {
      try {
        await this.send(payload)
        sent++
      } catch {
        failed++
      }
    }
    return { sent, failed }
  }
}
