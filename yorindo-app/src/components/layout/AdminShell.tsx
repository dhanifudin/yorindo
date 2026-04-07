'use client'

import { useState, useEffect } from 'react'
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
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Bell,
  Plus,
  Building2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'

const SIDEBAR_KEY = 'yorindo-sidebar-collapsed'

const NAV_ITEMS = [
  { href: '/app',              label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'viewer', 'staff', 'participant'] },
  { href: '/app/events',       label: 'Event',     icon: Calendar,        roles: ['admin', 'viewer'] },
  { href: '/app/contacts',     label: 'Kontak',    icon: Users,           roles: ['admin'] },
  { href: '/app/vendors',      label: 'Vendor',    icon: Building2,       roles: ['admin'] },
  { href: '/app/templates',    label: 'Template',  icon: FileText,        roles: ['admin'] },
  { href: '/app/users',        label: 'Akun',      icon: UserCog,         roles: ['admin'] },
  { href: '/app/scan',         label: 'Scan',      icon: QrCode,          roles: ['staff', 'admin'] },
]

export function AdminShell({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user)
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const router = useRouter()
  const pathname = usePathname()

  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false
    try { return localStorage.getItem(SIDEBAR_KEY) === 'true' } catch { return false }
  })
  const [hydrated, setHydrated] = useState(false)

  // Set hydrated after mount to enable CSS transitions (avoids SSR mismatch flash)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHydrated(true)
  }, [])

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev
      try { localStorage.setItem(SIDEBAR_KEY, String(next)) } catch { /* storage unavailable */ }
      return next
    })
  }

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

  const sidebarWidth = collapsed ? 'w-14' : 'w-56'
  const contentMargin = collapsed ? 'md:ml-14' : 'md:ml-56'

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'hidden md:flex flex-col fixed top-0 left-0 h-full bg-sidebar border-r border-sidebar-border z-40',
          hydrated && 'transition-[width] duration-200',
          sidebarWidth
        )}
      >
        <div className={cn(
          'flex items-center border-b border-sidebar-border',
          collapsed ? 'justify-center py-5 px-2' : 'justify-between px-4 py-5'
        )}>
          {!collapsed && <span className="font-bold text-sidebar-primary">Yorindo</span>}
          <button
            onClick={toggleCollapsed}
            className="text-sidebar-foreground hover:text-sidebar-accent-foreground transition-colors"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
          </button>
        </div>
        <nav className={cn('flex-1 py-4 space-y-0.5', collapsed ? 'px-1.5' : 'px-3')}>
          {visible.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                'flex items-center rounded-md text-sm transition-colors',
                collapsed ? 'relative justify-center px-2 py-2' : 'gap-3 px-3 py-2',
                isActive(item.href)
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
              )}
            >
              <item.icon className="size-4 shrink-0" />
              {!collapsed && (
                <>
                  {item.label}
                  {item.href === '/app/contacts' && duplicateCount > 0 && (
                    <span className="ml-auto inline-flex items-center justify-center size-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold">
                      {duplicateCount}
                    </span>
                  )}
                </>
              )}
              {collapsed && item.href === '/app/contacts' && duplicateCount > 0 && (
                <span className="absolute top-0 right-0 inline-flex items-center justify-center size-3.5 rounded-full bg-destructive text-destructive-foreground text-[7px] font-bold">
                  {duplicateCount}
                </span>
              )}
            </Link>
          ))}
        </nav>
        <div className={cn(
          'py-4 border-t border-sidebar-border space-y-2',
          collapsed ? 'px-1.5' : 'px-3'
        )}>
          {!collapsed && <p className="px-3 text-xs text-muted-foreground capitalize">{user?.role}</p>}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            title={collapsed ? 'Keluar' : undefined}
            className={cn(
              'w-full text-sidebar-foreground',
              collapsed ? 'justify-center px-0' : 'justify-start gap-2'
            )}
          >
            <LogOut className="size-4" />
            {!collapsed && 'Keluar'}
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className={cn('flex-1 flex flex-col', hydrated && 'transition-[margin] duration-200', contentMargin)}>
        {/* Topbar — hidden on scan page */}
        {!pathname.startsWith('/app/scan') && (
          <header className="sticky top-0 z-30 h-14 flex items-center gap-3 px-4 md:px-6 border-b border-border bg-background/95 backdrop-blur shrink-0">
            {/* Search placeholder */}
            <div className="flex items-center gap-2 flex-1 max-w-sm h-8 px-3 rounded-md border border-border bg-muted/50 text-xs text-muted-foreground cursor-default">
              <Search className="h-3.5 w-3.5 shrink-0" />
              <span>Cari atau ketik...</span>
            </div>

            <div className="flex-1" />

            {/* Buat Event — admin only */}
            {user?.role === 'admin' && (
              <Button asChild size="sm" className="gap-1.5 shrink-0">
                <Link href="/app/events">
                  <Plus className="h-3.5 w-3.5" />
                  Buat Event
                </Link>
              </Button>
            )}

            {/* Bell */}
            <button className="flex items-center justify-center w-8 h-8 rounded-md hover:bg-muted transition-colors text-muted-foreground">
              <Bell className="h-4 w-4" />
            </button>

            {/* Avatar chip */}
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">
              {user?.role
                ? ({ admin: 'A', staff: 'S', viewer: 'V', participant: 'P' } as Record<string, string>)[user.role] ?? '?'
                : '?'}
            </div>
          </header>
        )}

        <main className="mx-auto w-full max-w-[1440px] min-w-0 px-4 py-6 pb-24 md:px-6 md:pb-6 xl:px-8">
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
