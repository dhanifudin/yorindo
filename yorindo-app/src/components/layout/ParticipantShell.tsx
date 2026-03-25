'use client'

import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/authStore'

export function ParticipantShell({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user)
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const router = useRouter()

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch {
      // Proceed with client-side logout even if server request fails
    }
    clearAuth()
    router.replace('/')
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="border-b border-border bg-card">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <span className="font-bold text-primary">Yorindo</span>
          <div className="flex items-center gap-3">
            {(user?.name || user?.email) && (
              <span className="text-sm text-muted-foreground">{user.name || user.email}</span>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="gap-2 text-muted-foreground hover:text-foreground"
            >
              <LogOut className="size-4" />
              <span className="hidden sm:inline">Keluar</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-2xl mx-auto px-4 py-6 pb-10">
        {children}
      </main>
    </div>
  )
}
