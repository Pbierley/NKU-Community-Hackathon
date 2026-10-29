import { useEffect, useState } from 'react'
import AppHeader from '../components/AppHeader'
import { apiUrl } from '../api'
import { getAuthToken } from '../auth/useAuth'
import CampusMap from '../Navigation/CampusMap'
import { useBuildings } from '../Navigation/buildings'

export default function HeatMapScreen({ onNavigate }) {
  const { buildings } = useBuildings()
  const [heat, setHeat] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    const controller = new AbortController()
    const headers = {}
    const token = getAuthToken()
    if (token) headers.Authorization = `Bearer ${token}`
    fetch(apiUrl('/api/heat-map'), { headers, signal: controller.signal })
      .then((res) => {
        if (!res.ok) return res.json().then((body) => {
          throw new Error(body.error || 'Could not load the heat map.')
        })
        return res.json()
      })
      .then(setHeat)
      .catch((err) => {
        if (err.name === 'AbortError') return
        setError(err.message || 'Could not load the heat map.')
      })
    return () => controller.abort()
  }, [])

  const locationCount = heat?.locations?.reduce((sum, point) => sum + point.count, 0) ?? 0
  const destinationCount = heat?.destinations?.reduce((sum, point) => sum + point.count, 0) ?? 0
  const empty = heat && locationCount === 0 && destinationCount === 0

  return (
    <div className="screen h-full w-full max-w-full bg-canvas grid grid-cols-[minmax(0,1fr)] grid-rows-[auto_minmax(0,1fr)]">
      <AppHeader onNavigate={onNavigate} />
      <main className="relative isolate min-h-0 min-w-0 max-w-full overflow-hidden text-left mx-4 mt-4 mb-4 rounded-xl border border-line">
        <CampusMap
          buildings={buildings}
          onUserPan={() => {}}
          onLocate={() => {}}
          heat={heat}
          bottomInset={96}
        />
        <section className="absolute bottom-4 left-4 right-16 z-[1000] bg-white border border-line rounded-lg shadow-card p-3 text-left">
          <p className="text-[13px] font-bold text-ink leading-[1.4]">Heat map</p>
          {error && <p className="mt-0.5 text-[13px] text-body leading-[1.4]">{error}</p>}
          {!error && !heat && <p className="mt-0.5 text-[13px] text-muted leading-[1.4]">Loading routes…</p>}
          {empty && <p className="mt-0.5 text-[13px] text-muted leading-[1.4]">No routes have been saved yet.</p>}
          {heat && !empty && (
            <p className="mt-0.5 text-[13px] text-muted leading-[1.4]">
              Orange is where people were. Amber is where they were going. A larger circle is a larger share of the recorded routes.
            </p>
          )}
        </section>
      </main>
    </div>
  )
}
