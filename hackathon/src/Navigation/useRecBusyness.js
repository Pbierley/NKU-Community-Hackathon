import { useCallback, useEffect, useState } from 'react'
import { apiUrl } from '../api'
import { getAuthToken } from '../auth/useAuth'

async function loadBusyness() {
  const token = getAuthToken()
  const res = await fetch(apiUrl('/api/rec/busyness'), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error || 'Could not load recreation busyness.')
  return body
}

export function useRecBusyness() {
  const [summary, setSummary] = useState(null)
  const [error, setError] = useState(null)

  const reload = useCallback(async () => {
    try {
      setSummary(await loadBusyness())
      setError(null)
    } catch (err) {
      setError(err.message)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      reload()
    }, 0)
    return () => clearTimeout(timer)
  }, [reload])

  async function rate(placeId, rating) {
    const token = getAuthToken()
    const res = await fetch(apiUrl('/api/rec/busyness'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ placeId, rating }),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(body.error || 'Could not save recreation busyness.')
    setSummary(body)
    setError(null)
    return body
  }

  return { summary, error, rate, reload }
}
