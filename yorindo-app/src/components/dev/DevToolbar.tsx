'use client'
import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useQueryClient } from '@tanstack/react-query'
import { MOCK_USER_IDS } from '@/mocks/handlers/users'

const MOCK_USERS = {
  admin:       { id: MOCK_USER_IDS.devAdmin,  role: 'admin'  as const, email: 'admin@yorindo.id' },
  staff:       { id: MOCK_USER_IDS.devStaff,  role: 'staff'  as const, email: 'staff@yorindo.id' },
  viewer:      { id: MOCK_USER_IDS.devViewer, role: 'viewer' as const, email: 'viewer@yorindo.id' },
  participant: { id: 'cuid2devparticipant00001', role: 'participant' as const, name: 'Budi Peserta', email: 'budi.peserta@gmail.com' },
}

const MOCKS_ENABLED =
  process.env.NODE_ENV === 'development' ||
  process.env.NEXT_PUBLIC_ENABLE_MOCKS === 'true'

function triggerInstallPrompt() {
  const event = new Event('beforeinstallprompt', { cancelable: true })
  Object.assign(event, {
    prompt: async () => { console.log('[DevToolbar] Mock install prompt triggered') },
    userChoice: Promise.resolve({ outcome: 'dismissed' as const }),
  })
  window.dispatchEvent(event)
}

export function DevToolbar() {
  if (!MOCKS_ENABLED) return null
  return <DevToolbarInner />
}

function DevToolbarInner() {
  const { user, setAuth } = useAuthStore()
  const queryClient = useQueryClient()
  const [isExpanded, setIsExpanded] = useState(false)

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') setIsExpanded(false)
  }, [])

  useEffect(() => {
    if (isExpanded) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isExpanded, handleKeyDown])

  const loginAs = async (role: keyof typeof MOCK_USERS) => {
    const mockUser = MOCK_USERS[role]
    // Try real API login first (uses seeded demo users)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: mockUser.email, password: 'Password123!' }),
      })
      if (res.ok) {
        const data = await res.json()
        setAuth(data.accessToken, data.user, data.eventKeys ?? {})
        // Invalidate all queries so they re-fetch with the new token
        queryClient.invalidateQueries()
        return
      }
    } catch { /* fallback to mock login */ }

    // Fallback: set mock token for MSW handlers
    setAuth('dev-token', mockUser)
    queryClient.invalidateQueries()
  }

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        aria-label="Open dev toolbar"
        className="fixed bottom-16 right-0 z-50 rounded-l border border-r-0 border-yellow-400 bg-yellow-100 px-1 py-2 text-xs font-bold text-yellow-800 shadow-lg hover:bg-yellow-200 focus-visible:outline-2 focus-visible:outline-yellow-500"
      >
        <span className="[writing-mode:vertical-rl]">DEV</span>
      </button>
    )
  }

  return (
    <div className="fixed bottom-16 right-0 z-50 flex flex-col gap-1 rounded-l border border-r-0 border-yellow-400 bg-yellow-100 p-2 text-xs shadow-lg">
      <button
        onClick={() => setIsExpanded(false)}
        aria-label="Close dev toolbar"
        className="font-bold text-yellow-800 hover:text-yellow-600 focus-visible:outline-2 focus-visible:outline-yellow-500 pb-1"
      >
        DEV &times;
      </button>
      {(['admin', 'staff', 'viewer', 'participant'] as const).map((role) => (
        <button
          key={role}
          aria-pressed={user?.role === role}
          className={`rounded px-2 py-1 focus-visible:outline-2 focus-visible:outline-yellow-500 ${
            user?.role === role
              ? 'bg-yellow-400 font-bold text-yellow-900'
              : 'bg-white text-gray-700 hover:bg-yellow-50'
          }`}
          onClick={() => loginAs(role)}
        >
          {role}
        </button>
      ))}
      <hr className="border-yellow-400 my-1" />
      <button
        className="rounded px-2 py-1 bg-blue-100 text-blue-700 hover:bg-blue-200 focus-visible:outline-2 focus-visible:outline-yellow-500"
        onClick={triggerInstallPrompt}
      >
        PWA
      </button>
    </div>
  )
}
