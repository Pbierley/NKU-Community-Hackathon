import { useMemo } from 'react'
import AppHeader from '../components/AppHeader'
import { hasLocation, isParkingPlace, mapLabel, useBuildings } from '../Navigation/buildings'
import { useParkingFullness } from '../Navigation/useParkingFullness'

function reportFor(summary, placeId) {
  return summary?.places?.find((place) => place.placeId === placeId) ?? null
}

function sortByFullness(places, summary) {
  return [...places].sort((a, b) => {
    const left = reportFor(summary, a.id)
    const right = reportFor(summary, b.id)
    if (left && !right) return -1
    if (!left && right) return 1
    if (left && right && left.average !== right.average) return left.average - right.average
    return a.name.localeCompare(b.name)
  })
}

export default function ParkingScreen({ onNavigate }) {
  const { buildings, loading, error: buildingsError } = useBuildings()
  const { summary, error: fullnessError } = useParkingFullness()
  const places = useMemo(
    () => sortByFullness(buildings.filter((building) => isParkingPlace(building) && hasLocation(building)), summary),
    [buildings, summary],
  )
  const error = buildingsError ?? fullnessError

  return (
    <div className="screen h-full flex flex-col bg-canvas">
      <AppHeader onNavigate={onNavigate} />
      <main className="flex-1 overflow-y-auto no-scrollbar px-4 py-4 text-left">
        <div className="w-full max-w-2xl mx-auto">
          <h1 className="text-xl font-bold tracking-tight leading-[1.3]">Parking</h1>
          <p className="mt-1 text-[14px] text-muted leading-[1.5]">
            Least full first. Lots and garages with no reports today are listed last. Rankings reset each day.
          </p>

          {loading && <p className="mt-6 text-[15px] text-muted">Loading parking…</p>}
          {error && <p className="mt-6 text-[15px] text-body">{error}</p>}

          {!loading && !error && (
            <ul className="mt-4 space-y-2">
              {places.map((place) => {
                const report = reportFor(summary, place.id)
                return (
                  <li
                    key={place.id}
                    className="flex items-center gap-4 bg-white border border-line rounded-xl px-4 py-3 shadow-card"
                  >
                    <span className="shrink-0 min-w-10 h-10 px-2 rounded-md bg-wash border border-line text-[13px] font-bold flex items-center justify-center">
                      {mapLabel(place)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-semibold leading-[1.5]">{place.name}</span>
                      <span className="block text-[13px] text-muted leading-[1.4]">
                        {report
                          ? `${report.count} ${report.count === 1 ? 'report' : 'reports'} today`
                          : 'Not rated today'}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      {report ? (
                        <span className="text-[15px] font-bold tnum">{report.average}<span className="text-[12px] font-semibold text-muted"> / 5</span></span>
                      ) : (
                        <span className="text-[13px] font-semibold text-muted">—</span>
                      )}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </main>
    </div>
  )
}
