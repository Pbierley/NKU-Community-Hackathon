import { useMemo, useState } from 'react'
import AppHeader from '../components/AppHeader'
import { hasLocation, isParkingPlace, mapLabel, useBuildings } from '../Navigation/buildings'
import { FULLNESS_LEVELS, formatReportedAt } from '../Navigation/ParkingFullness'
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
    if (left && right && left.rating !== right.rating) return left.rating - right.rating
    return a.name.localeCompare(b.name)
  })
}

export default function ParkingScreen({ onNavigate, user }) {
  const { buildings, loading, error: buildingsError } = useBuildings()
  const { summary, error: fullnessError, rate } = useParkingFullness()
  const [busyId, setBusyId] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [rateError, setRateError] = useState(null)
  const places = useMemo(
    () => sortByFullness(buildings.filter((building) => isParkingPlace(building) && hasLocation(building)), summary),
    [buildings, summary],
  )
  const error = buildingsError ?? fullnessError

  async function choose(placeId, rating) {
    setBusyId(placeId)
    setRateError(null)
    try {
      await rate(placeId, rating)
      setEditingId(null)
    } catch (err) {
      setRateError(err.message || 'Could not save your rating.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="screen h-full flex flex-col bg-canvas">
      <AppHeader onNavigate={onNavigate} />
      <main className="flex-1 overflow-y-auto no-scrollbar px-4 py-4 text-left">
        <div className="w-full max-w-2xl mx-auto">
          <h1 className="text-xl font-bold tracking-tight leading-[1.3]">Parking</h1>
          <p className="mt-1 text-[14px] text-muted leading-[1.5]">
            Least full first, using the latest report. Lots and garages with no reports today are listed last.
          </p>
          <p className="mt-1 text-[14px] text-muted leading-[1.5]">
            Scores run from 1 to 5: 1 means empty and 5 means very full.
          </p>
          {!user && (
            <button
              type="button"
              onClick={() => onNavigate('login')}
              className="mt-3 h-10 px-4 rounded-md bg-nku font-bold text-[14px] text-ink"
            >
              Sign in to add a score
            </button>
          )}

          {loading && <p className="mt-6 text-[15px] text-muted">Loading parking…</p>}
          {error && <p className="mt-6 text-[15px] text-body">{error}</p>}
          {rateError && <p className="mt-4 text-[14px] text-body">{rateError}</p>}

          {!loading && !error && (
            <ul className="mt-4 space-y-2">
              {places.map((place) => {
                const report = reportFor(summary, place.id)
                const reportedAt = formatReportedAt(report?.reportedAt)
                const mine = report?.mine ?? null
                return (
                  <li
                    key={place.id}
                    className="bg-white border border-line rounded-xl px-4 py-3 shadow-card"
                  >
                    <div className="flex items-center gap-4">
                      <span className="shrink-0 min-w-10 h-10 px-2 rounded-md bg-wash border border-line text-[13px] font-bold flex items-center justify-center">
                        {mapLabel(place)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-semibold leading-[1.5]">{place.name}</span>
                        <span className="block text-[13px] text-muted leading-[1.4]">
                          {report
                            ? reportedAt
                              ? `Reported ${reportedAt}`
                              : 'Reported today'
                            : 'Not rated today'}
                        </span>
                      </span>
                      <span className="shrink-0 flex items-center gap-2">
                        <span className="text-right">
                          {report ? (
                            <span className="text-[15px] font-bold tnum">{report.rating}<span className="text-[12px] font-semibold text-muted"> / 5</span></span>
                          ) : (
                            <span className="text-[13px] font-semibold text-muted">—</span>
                          )}
                        </span>
                        {user && (
                          <button
                            type="button"
                            onClick={() => setEditingId((current) => (current === place.id ? null : place.id))}
                            className="h-8 px-3 rounded-md border border-line bg-white text-[13px] font-bold text-ink"
                          >
                            {editingId === place.id ? 'Cancel' : 'Update'}
                          </button>
                        )}
                      </span>
                    </div>
                    {user && editingId === place.id && (
                      <div className="mt-3">
                        <p className="mb-1.5 text-[12px] text-muted leading-[1.4]">
                          1 means empty and 5 means very full.
                        </p>
                        <div className="flex gap-1.5" role="group" aria-label={`Fullness for ${place.name}, from 1 empty to 5 very full`}>
                          {FULLNESS_LEVELS.map((level) => {
                            const selected = mine === level.value
                            return (
                              <button
                                key={level.value}
                                type="button"
                                disabled={busyId === place.id}
                                aria-pressed={selected}
                                aria-label={`${level.value}, ${level.label}`}
                                onClick={() => choose(place.id, level.value)}
                                className={`h-10 flex-1 rounded-md border text-[14px] font-bold ${
                                  selected
                                    ? 'bg-nku border-nku text-ink'
                                    : 'bg-white border-line text-ink'
                                }`}
                              >
                                {level.value}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}
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
