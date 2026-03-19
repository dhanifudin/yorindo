# Story 7.4: OTP-Based Identity Recovery

## Story
Staff can recover participant identity by requesting/verifying OTP when QR is unavailable.

## Acceptance Criteria
- [x] OTP Recovery Sheet on scan page
- [x] Enter phone → POST /api/scan/otp/request
- [x] Enter OTP → POST /api/scan/otp/verify
- [x] Success shows check-in confirmation

## Status: review
