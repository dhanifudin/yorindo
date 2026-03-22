export interface EmailPayload {
  to: string
  subject: string
  body: string
  templateId?: string
  variables?: Record<string, string>
}

export interface IEmailService {
  send(payload: EmailPayload): Promise<{ messageId: string }>
  sendBatch(payloads: EmailPayload[]): Promise<{ sent: number; failed: number }>
}
