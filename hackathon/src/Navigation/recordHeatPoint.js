import { useEffect, useRef } from 'react'
import { apiUrl } from '../api'
import { getAuthToken } from '../auth/useAuth'

function recordHeatPoint(destinationId, position) {
  const body = { destinationId }
  if (Array.isArray(position)) {
    body.lat = position[0]
    body.lng = position[1]
  }
  const headers = { 'Content-Type': 'application/json' }
  const token = getAuthToken()
  if (token) headers.Authorization = `Bearer ${token}`
  fetch(apiUrl('/api/heat-map'), {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  }).catch(() => {})
}

// Saves one heat point per destination. Waits briefly for GPS so a point
// picked before location is ready still includes where the person is.
export function useRecordedDestination(destinationId, position) {
  const sent = useRef(null)

  useEffect(() => {
    if (destinationId == null) return
    if (sent.current === destinationId) return
    const delay = Array.isArray(position) ? 0 : 1200
    const timer = setTimeout(() => {
      if (sent.current === destinationId) return
      sent.current = destinationId
      recordHeatPoint(destinationId, position)
    }, delay)
    return () => clearTimeout(timer)
  }, [destinationId, position])
}
