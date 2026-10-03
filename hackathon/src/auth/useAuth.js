import { useCallback, useEffect, useState } from 'react'

const TOKEN_KEY = 'nku-auth-token'
const USER_KEY = 'nku-user'

export function getAuthToken() {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

function readStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

async function request(path, { token, ...options } = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers ?? {}) }
  const authToken = token ?? getAuthToken()
  if (authToken) headers.Authorization = `Bearer ${authToken}`
  const res = await fetch(path, { ...options, headers })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`)
  return body
}

export function useAuth() {
  const [user, setUser] = useState(readStoredUser)
  const [token, setToken] = useState(getAuthToken)
  const [loading, setLoading] = useState(true)

  // Revalidate the stored session against MongoDB/JSON on boot.
  useEffect(() => {
    let cancelled = false
    async function revalidate() {
      const stored = getAuthToken()
      if (!stored) {
        setLoading(false)
        return
      }
      try {
        const { user: me } = await request('/api/auth/me', { token: stored })
        if (!cancelled) {
          setUser(me)
          localStorage.setItem(USER_KEY, JSON.stringify(me))
        }
      } catch {
        if (!cancelled) {
          setUser(null)
          setToken(null)
          localStorage.removeItem(TOKEN_KEY)
          localStorage.removeItem(USER_KEY)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    revalidate()
    return () => {
      cancelled = true
    }
  }, [])

  const saveSession = useCallback((session) => {
    setToken(session.token)
    setUser(session.user)
    localStorage.setItem(TOKEN_KEY, session.token)
    localStorage.setItem(USER_KEY, JSON.stringify(session.user))
    return session.user
  }, [])

  const login = useCallback(
    async (email, password) => {
      const session = await request('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
      return saveSession(session)
    },
    [saveSession],
  )

  const register = useCallback(
    async (fields) => {
      const session = await request('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(fields),
      })
      return saveSession(session)
    },
    [saveSession],
  )

  const logout = useCallback(async () => {
    const stored = getAuthToken()
    if (stored) {
      await request('/api/auth/logout', {
        method: 'POST',
        body: JSON.stringify({}),
        token: stored,
      }).catch(() => {})
    }
    setUser(null)
    setToken(null)
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  }, [])

  const updateProfile = useCallback(
    async (patch) => {
      const { user: nextUser } = await request('/api/auth/me', {
        method: 'PATCH',
        body: JSON.stringify(patch),
      })
      setUser(nextUser)
      localStorage.setItem(USER_KEY, JSON.stringify(nextUser))
      return nextUser
    },
    [],
  )

  return { user, token, loading, login, register, logout, updateProfile, authFetch: request }
}
