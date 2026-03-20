/**
 * Deterministic djb2-variant hash — maps a string to an integer in [0, 99].
 * Used for AI suitability scoring (contactId + eventId as input).
 */
export function djb2(s: string): number {
  return s.split('').reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 100, 0)
}
