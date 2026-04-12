import { useQuery } from '@tanstack/react-query'

interface EmailProviderConfig {
  provider: 'brevo' | 'smtp' | 'mock' | null
  configured: boolean
}

/**
 * Fetches email provider configuration from settings.
 * Returns whether email is properly configured for blasting.
 */
export function useEmailConfig() {
  return useQuery<EmailProviderConfig>({
    queryKey: ['settings', 'email-config'],
    queryFn: async () => {
      const res = await fetch('/api/settings/providers')
      if (!res.ok) throw new Error('Failed to fetch email config')
      const data = await res.json() as { email: Record<string, string | null> }

      const email = data.email ?? {}
      const provider = email.EMAIL_PROVIDER ?? email.SMTP_HOST ? (email.SMTP_HOST ? 'smtp' : 'brevo') : null

      // Check if provider is configured
      let configured = false
      if (provider === 'brevo') {
        configured = !!(email.BREVO_API_KEY && email.BREVO_API_KEY !== '••••••••')
      } else if (provider === 'smtp') {
        configured = !!(email.SMTP_HOST && email.SMTP_USER && email.SMTP_PASS)
      }

      return { provider: provider as EmailProviderConfig['provider'], configured }
    },
    staleTime: 30_000,
  })
}
