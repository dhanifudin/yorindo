import { useAuthStore } from '@/store/authStore'

/**
 * Read the auth token directly from localStorage where zustand persist stores it.
 * This works synchronously before zustand has finished hydrating.
 */
function getStoredToken(): string | null {
  try {
    const raw = localStorage.getItem('yorindo-auth')
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed.state?.accessToken ?? null
  } catch {
    return null
  }
}

/**
 * Intercept window.fetch to add Authorization header for /api/* requests.
 * Sets up immediately (not in useEffect) so it catches all API calls.
 */
export function setupFetchInterceptor(): void {
  // Prevent double-setup
  if ((window as any).__FETCH_INTERCEPTOR_SETUP) return
  ;(window as any).__FETCH_INTERCEPTOR_SETUP = true

  const originalFetch = window.fetch.bind(window)
  let refreshPromise: Promise<string | null> | null = null

  async function refreshAccessToken(): Promise<string | null> {
    if (!refreshPromise) {
      refreshPromise = originalFetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
      })
        .then(async (response) => {
          if (!response.ok) return null
          const data = await response.json() as { accessToken?: string }
          return data.accessToken ?? null
        })
        .finally(() => {
          refreshPromise = null
        })
    }
    return refreshPromise
  }

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
    const request = new Request(
      typeof input === 'string' && input.startsWith('/') ? new URL(input, window.location.origin) : input,
      init,
    )
    const headers = new Headers(request.headers)

    // Add auth header for API requests if token exists (read from localStorage directly)
    // Match both relative (/api/...) and same-origin absolute (http://localhost/api/...) URLs
    const isApiUrl = url.startsWith('/api/') ||
      (url.startsWith(window.location.origin) && new URL(url).pathname.startsWith('/api/'))
    if (isApiUrl && !headers.has('Authorization')) {
      const token = getStoredToken() || useAuthStore.getState().accessToken
      if (token) {
        headers.set('Authorization', `Bearer ${token}`)
      }
    }

    const response = await originalFetch(input, {
      ...init,
      headers,
      credentials: init?.credentials ?? 'same-origin',
    })

    // Handle 401 by attempting token refresh
    if (response.status === 401) {
      const isApi = url.startsWith('/api/') ||
        (url.startsWith(window.location.origin) && new URL(url).pathname.startsWith('/api/'))
      const isAuthEndpoint = ['/api/auth/login', '/api/auth/refresh', '/api/auth/logout'].some(u => url.startsWith(u))
      const alreadyRetried = headers.get('x-auth-retry') === '1'

      if (isApi && !isAuthEndpoint && !alreadyRetried) {
        const refreshedToken = await refreshAccessToken()
        if (refreshedToken) {
          const currentUser = useAuthStore.getState().user
          if (currentUser) {
            useAuthStore.getState().setAuth(refreshedToken, currentUser)
          }

          const retryHeaders = new Headers(headers)
          retryHeaders.set('Authorization', `Bearer ${refreshedToken}`)
          retryHeaders.set('x-auth-retry', '1')

          return originalFetch(input, {
            ...init,
            headers: retryHeaders,
            credentials: init?.credentials ?? 'same-origin',
          })
        } else {
          useAuthStore.getState().clearAuth()
          window.location.href = '/login'
        }
      }
    }

    return response
  }
}
