export interface WhatsAppPayload {
  to: string            // phone number +62XXXXXXXXXX
  templateName: string
  variables?: Record<string, string>
  body?: string         // plain text fallback
}

export interface IWhatsAppService {
  send(payload: WhatsAppPayload): Promise<{ messageId: string }>
  sendBatch(payloads: WhatsAppPayload[]): Promise<{ sent: number; failed: number }>
}
