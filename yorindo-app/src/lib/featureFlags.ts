/**
 * Centralized feature flag utility.
 * All components should import from here — do not re-declare env checks inline.
 */

/** Gates experimental features (participant SSO, waitlist, etc.)
 *  Set NEXT_PUBLIC_ENABLE_EXPERIMENTAL=true in .env.local to enable. */
export const EXPERIMENTAL_ENABLED =
  process.env.NEXT_PUBLIC_ENABLE_EXPERIMENTAL === 'true'
