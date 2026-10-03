import { useCallback, useEffect, useState } from 'react'
import { apiUrl } from '../api'
import { getAuthToken } from '../auth/useAuth'

async function loadFullness() {
  const token = getAuthToken()
  const res = await fetch(apiUrl('/api/parking/fullness'), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error || 'Could not load parking fullness.')
  return body
}

export function useParkingFullness() {
  const [summary, setSummary] = useState(null)
  const [error, setError] = useState(null)

  const reload = useCallback(async () => {
    try {
      setSummary(await loadFullness())
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
    const res = await fetch(apiUrl('/api/parking/fullness'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ placeId, rating }),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(body.error || 'Could not save parking fullness.')
    setSummary(body)
    setError(null)
    return body
  }

  return { summary, error, rate, reload }
}
