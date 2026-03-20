'use client'
import { useAuthStore } from '@/store/authStore'

const MOCK_USERS = {
  admin: { id: 'dev-admin', role: 'admin' as const },
  staff: { id: 'dev-staff', role: 'staff' as const },
  viewer: { id: 'dev-viewer', role: 'viewer' as const },
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

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { user, setAccessToken } = useAuthStore()

  return (
    <div className="fixed bottom-4 right-4 z-50 flex gap-2 rounded border border-yellow-400 bg-yellow-100 p-2 text-xs shadow-lg">
      <span className="font-bold text-yellow-800">DEV:</span>
      {(['admin', 'staff', 'viewer'] as const).map((role) => (
        <button
          key={role}
          className={`rounded px-2 py-1 ${
            user?.role === role
              ? 'bg-yellow-400 font-bold text-yellow-900'
              : 'bg-white text-gray-700 hover:bg-yellow-50'
          }`}
          onClick={() => setAccessToken('dev-token', MOCK_USERS[role])}
        >
          {role}
        </button>
      ))}
      <div className="border-l border-yellow-400 mx-1" />
      <button
        className="rounded px-2 py-1 bg-blue-100 text-blue-700 hover:bg-blue-200"
        onClick={triggerInstallPrompt}
      >
        PWA
      </button>
    </div>
  )
}
