import type { IOtpService } from '../../../interfaces/services/IOtpService.js'

interface OtpRecord {
  phone: string
  otp: string
  sentAt: string
  expiresAt: string
}

export class MockOtpService implements IOtpService {
  private sentOtps: OtpRecord[] = []

  async send(phone: string): Promise<{ token: string; expiresAt: string }> {
    const otp = '123456'  // hardcoded for mock — always 123456
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString()
    this.sentOtps.push({ phone, otp, sentAt: new Date().toISOString(), expiresAt })
    return { token: otp, expiresAt }
  }

  async verify(phone: string, otp: string): Promise<{ valid: boolean }> {
    const record = this.sentOtps
      .filter(r => r.phone === phone)
      .findLast(() => true)
    return { valid: record?.otp === otp && otp === '123456' }
  }

  getSentOtps(): OtpRecord[] {
    return [...this.sentOtps]
  }

  reset(): void {
    this.sentOtps = []
  }
}
