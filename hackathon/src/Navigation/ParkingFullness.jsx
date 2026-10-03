import { useState } from 'react'
import { mapLabel } from './buildings'

const LEVELS = [
  { value: 1, label: 'Not full' },
  { value: 2, label: 'Fairly open' },
  { value: 3, label: 'Filling up' },
  { value: 4, label: 'Almost full' },
  { value: 5, label: 'Full' },
]

function placeReport(summary, placeId) {
  return summary?.places?.find((place) => place.placeId === placeId) ?? null
}

export default function ParkingFullness({ place, user, summary, onRate, onSignIn }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const report = placeReport(summary, place.id)
  const mine = report?.mine ?? null

  async function choose(rating) {
    setBusy(true)
    setError(null)
    try {
      await onRate(rating)
    } catch (err) {
      setError(err.message || 'Could not save your rating.')
    } finally {
      setBusy(false)
    }
  }

  const today = report
    ? `${report.average} of 5 from ${report.count} ${report.count === 1 ? 'report' : 'reports'}`
    : 'No reports yet today'

  return (
    <section className="absolute bottom-4 left-4 right-16 z-[1000] bg-white border border-line rounded-lg shadow-card p-3 text-left">
      <p className="text-[13px] font-bold text-ink leading-[1.4]">
        {mapLabel(place)} · {place.name}
      </p>
      <p className="mt-0.5 text-[13px] text-muted leading-[1.4]">How full is it? {today}</p>
      {user ? (
        <div className="mt-2 flex gap-1.5" role="group" aria-label="Fullness from 1, not full, to 5, full">
          {LEVELS.map((level) => {
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
      ) : (
        <button
          type="button"
          onClick={onSignIn}
          className="mt-2 h-10 w-full rounded-md bg-nku font-bold text-[14px] text-ink"
        >
          Sign in to rate
        </button>
      )}
      <p className="mt-1.5 text-[12px] text-muted leading-[1.4]">
        {user ? '1 is not full, 5 is full. ' : ''}
        Rankings reset each day.
        {error ? ` ${error}` : ''}
      </p>
    </section>
  )
}
