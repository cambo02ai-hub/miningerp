import { API_BASE_URL } from '../config'
import { getAuthToken, clearAuthData } from '../services/authStorage'

type Options = RequestInit & { auth?: boolean }

const controllers = new Map<string, AbortController>()

export async function fetchJson<T>(endpoint: string, options: Options = {}): Promise<T> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  }

  const token = getAuthToken()
  if (options.auth !== false && token && !token.startsWith('fallback-token-')) {
    (headers as any)['Authorization'] = `Bearer ${token}`
  }

  const url = `${API_BASE_URL}${endpoint}`
  const method = options.method?.toUpperCase() || 'GET'
  const key = method === 'GET' ? url : ''
  if (key) {
    const prev = controllers.get(key)
    if (prev) prev.abort()
    const ctrl = new AbortController()
    controllers.set(key, ctrl)
    options.signal = ctrl.signal
  }

  let res: Response
  try {
    res = await fetch(url, { ...options, headers })
  } catch (e: any) {
    if (e?.name === 'AbortError') {
      const abortErr = new Error('Request aborted')
      ;(abortErr as any).name = 'AbortError'
      throw abortErr
    }
    throw e
  }

  const isAuthEndpoint = endpoint.startsWith('/auth/login') || endpoint.startsWith('/auth/register') || endpoint.startsWith('/auth/me')

  if ((res.status === 401 || res.status === 403) && !isAuthEndpoint && !token?.startsWith('fallback-token-')) {
    clearAuthData()
    if (typeof window !== 'undefined') {
      window.location.href = '/login'
    }
    throw new Error('Unauthorized')
  }

  if (!res.ok) {
    let data: any = null
    try {
      data = await res.json()
    } catch {
      data = null
    }
    throw new Error(data?.message || data?.error || `HTTP ${res.status}`)
  }

  return res.json() as Promise<T>
}
