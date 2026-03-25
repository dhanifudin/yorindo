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
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'

const SIDEBAR_KEY = 'yorindo-sidebar-collapsed'

const NAV_ITEMS = [
  { href: '/app',              label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'viewer', 'staff', 'participant'] },
  { href: '/app/events',       label: 'Event',     icon: Calendar,        roles: ['admin', 'viewer'] },
  { href: '/app/contacts',     label: 'Kontak',    icon: Users,           roles: ['admin'] },
  { href: '/app/yorimind',     label: 'YoriMind',  icon: Sparkles,        roles: ['admin'] },
  { href: '/app/templates',    label: 'Template',  icon: FileText,        roles: ['admin'] },
  { href: '/app/users',        label: 'Akun',      icon: UserCog,         roles: ['admin'] },
  { href: '/app/scan',         label: 'Scan',      icon: QrCode,          roles: ['staff', 'admin'] },
]

export function AdminShell({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user)
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const router = useRouter()
  const pathname = usePathname()

  const [collapsed, setCollapsed] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  // Hydrate collapsed state from localStorage (avoids SSR mismatch)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(SIDEBAR_KEY)
      if (stored === 'true') setCollapsed(true)
    } catch {
      // localStorage may be unavailable — use default
    }
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
      <div className={cn('flex-1', hydrated && 'transition-[margin] duration-200', contentMargin)}>
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
