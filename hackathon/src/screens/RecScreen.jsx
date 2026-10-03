import { useState } from 'react'
import AppHeader from '../components/AppHeader'
import { isRecreationCenter, mapLabel, useBuildings } from '../Navigation/buildings'
import { BUSYNESS_LEVELS, formatReportedAt } from '../Navigation/ParkingFullness'
import { useRecBusyness } from '../Navigation/useRecBusyness'

export default function RecScreen({ onNavigate, user }) {
  const { buildings, loading, error: buildingsError } = useBuildings()
  const { summary, error: busynessError, rate } = useRecBusyness()
  const [busy, setBusy] = useState(false)
  const [editing, setEditing] = useState(false)
  const [rateError, setRateError] = useState(null)
  const place = buildings.find((building) => isRecreationCenter(building)) ?? null
  const report = place ? summary?.places?.find((item) => item.placeId === place.id) ?? null : null
  const reportedAt = formatReportedAt(report?.reportedAt)
  const mine = report?.mine ?? null
  const error = buildingsError ?? busynessError

  async function choose(rating) {
    if (!place) return
    setBusy(true)
    setRateError(null)
    try {
      await rate(place.id, rating)
      setEditing(false)
    } catch (err) {
      setRateError(err.message || 'Could not save your rating.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="screen h-full flex flex-col bg-canvas">
      <AppHeader onNavigate={onNavigate} />
      <main className="flex-1 overflow-y-auto no-scrollbar px-4 py-4 text-left">
        <div className="w-full max-w-2xl mx-auto">
          <h1 className="text-xl font-bold tracking-tight leading-[1.3]">Campus Rec</h1>
          <p className="mt-1 text-[14px] text-muted leading-[1.5]">
            Latest report of how busy the Campus Rec Center is. Scores reset each day.
          </p>
          <p className="mt-1 text-[14px] text-muted leading-[1.5]">
            Scores run from 1 to 5: 1 means empty and 5 means packed.
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

          {loading && <p className="mt-6 text-[15px] text-muted">Loading Campus Rec…</p>}
          {error && <p className="mt-6 text-[15px] text-body">{error}</p>}
          {rateError && <p className="mt-4 text-[14px] text-body">{rateError}</p>}

          {!loading && !error && !place && (
            <p className="mt-6 text-[15px] text-muted">Campus Rec Center is not on the campus list yet.</p>
          )}

          {!loading && !error && place && (
            <ul className="mt-4 space-y-2">
              <li className="bg-white border border-line rounded-xl px-4 py-3 shadow-card">
                <div className="flex items-center gap-4">
                  <span className="shrink-0 min-w-10 h-10 px-2 rounded-md bg-wash border border-line text-[13px] font-bold flex items-center justify-center">
                    {mapLabel(place)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-semibold leading-[1.5]">{place.name}</span>
                    <span className="block text-[13px] text-muted leading-[1.4]">
                      {report
                        ? reportedAt
                          ? `Last updated ${reportedAt}`
                          : 'Updated today'
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
                        onClick={() => setEditing((current) => !current)}
                        className="h-8 px-3 rounded-md border border-line bg-white text-[13px] font-bold text-ink"
                      >
                        {editing ? 'Cancel' : 'Update'}
                      </button>
                    )}
                  </span>
                </div>
                {user && editing && (
                  <div className="mt-3">
                    <p className="mb-1.5 text-[12px] text-muted leading-[1.4]">
                      1 means empty and 5 means packed.
                    </p>
                    <div className="flex gap-1.5" role="group" aria-label="Busyness from 1, empty, to 5, packed">
                      {BUSYNESS_LEVELS.map((level) => {
                        const selected = mine === level.value
                        return (
                          <button
                            key={level.value}
                            type="button"
                            disabled={busy}
                            aria-pressed={selected}
                            aria-label={`${level.value}, ${level.label}`}
                            onClick={() => choose(level.value)}
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
            </ul>
          )}
        </div>
      </main>
    </div>
  )
}
