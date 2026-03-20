'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import {
  LayoutDashboard,
  Users,
  Calendar,
  FileText,
  UserCog,
  LogOut,
  QrCode,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'

const NAV_ITEMS = [
  { href: '/app',              label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'viewer', 'staff'] },
  { href: '/app/contacts',     label: 'Kontak',    icon: Users,           roles: ['admin'] },
  { href: '/app/events',       label: 'Event',     icon: Calendar,        roles: ['admin', 'viewer'] },
  { href: '/app/templates',    label: 'Template',  icon: FileText,        roles: ['admin'] },
  { href: '/app/users',        label: 'Akun',      icon: UserCog,         roles: ['admin'] },
  { href: '/app/scan',         label: 'Scan',      icon: QrCode,          roles: ['staff', 'admin'] },
]

export function AdminShell({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user)
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const router = useRouter()
  const pathname = usePathname()

  const visible = NAV_ITEMS.filter((item) => item.roles.includes(user?.role ?? 'viewer'))

  // Fetch duplicate count for badge (admin only)
  const { data: dupData } = useQuery<{ data: Array<unknown> }>({
    queryKey: ['contacts', 'duplicates-count'],
    queryFn: () => fetch('/api/contacts/duplicates').then((r) => r.json()),
    enabled: user?.role === 'admin',
    refetchInterval: 60_000,
  })
  const duplicateCount = dupData?.data?.length ?? 0

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch {
      // Proceed with client-side logout even if server request fails
    }
    router.replace('/')
    clearAuth()
  }

  // Exact match for /app dashboard; prefix match for all other routes
  const isActive = (href: string) =>
    href === '/app' ? pathname === '/app' : pathname.startsWith(href)

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col fixed top-0 left-0 h-full w-56 bg-sidebar border-r border-sidebar-border z-40">
        <div className="px-4 py-5 border-b border-sidebar-border">
          <span className="font-bold text-sidebar-primary">Yorindo</span>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {visible.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                isActive(item.href)
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
              )}
            >
              <item.icon className="size-4 shrink-0" />
              {item.label}
              {item.href === '/app/contacts' && duplicateCount > 0 && (
                <span className="ml-auto inline-flex items-center justify-center size-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold">
                  {duplicateCount}
                </span>
              )}
            </Link>
          ))}
        </nav>
        <div className="px-3 py-4 border-t border-sidebar-border space-y-2">
          <p className="px-3 text-xs text-muted-foreground capitalize">{user?.role}</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="w-full justify-start gap-2 text-sidebar-foreground"
          >
            <LogOut className="size-4" />
            Keluar
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 md:ml-56">
        <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 pb-24 md:pb-6">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-background border-t border-border z-50 flex items-center justify-around">
        {visible.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'relative flex flex-col items-center justify-center gap-0.5 min-h-[56px] min-w-[56px] px-2 py-2 text-[10px] font-medium transition-colors',
              isActive(item.href)
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <item.icon className="size-5" />
            <span>{item.label}</span>
            {item.href === '/app/contacts' && duplicateCount > 0 && (
              <span className="absolute top-1 right-0 inline-flex items-center justify-center size-4 rounded-full bg-destructive text-destructive-foreground text-[8px] font-bold">
                {duplicateCount}
              </span>
            )}
          </Link>
        ))}
      </nav>
    </div>
  )
}
