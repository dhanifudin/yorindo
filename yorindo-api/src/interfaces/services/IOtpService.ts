/**
 * OTP Service Interface
 *
 * Placeholder — KTP verification via OTP was removed from MVP scope,
 * but the interface remains to avoid contract breakage if re-introduced.
 * Phase 1: MockOtpService always succeeds.
 */
export interface IOtpService {
  /**
   * Send an OTP to the given phone number.
   * Returns the OTP token (for test environments) or a masked reference.
   */
  send(phone: string): Promise<{ token: string; expiresAt: string }>

  /**
   * Verify an OTP token for the given phone number.
   */
  verify(phone: string, otp: string): Promise<{ valid: boolean }>
}
