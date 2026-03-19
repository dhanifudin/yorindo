import { PublicShell } from '@/components/layout/PublicShell'

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return <PublicShell className="px-0 py-0 max-w-none">{children}</PublicShell>
}
