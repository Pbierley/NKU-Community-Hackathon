import { useEffect, useState } from 'react'
import { mapLabel } from './buildings'

export const FULLNESS_LEVELS = [
  { value: 1, label: 'Empty' },
  { value: 2, label: 'Fairly open' },
  { value: 3, label: 'Filling up' },
  { value: 4, label: 'Almost full' },
  { value: 5, label: 'Very full' },
]

export const BUSYNESS_LEVELS = [
  { value: 1, label: 'Empty' },
  { value: 2, label: 'Fairly quiet' },
  { value: 3, label: 'Moderate' },
  { value: 4, label: 'Busy' },
  { value: 5, label: 'Packed' },
]

export function formatReportedAt(iso) {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

function placeReport(summary, placeId) {
  return summary?.places?.find((place) => place.placeId === placeId) ?? null
}

export default function ParkingFullness({
  place,
  user,
  summary,
  onRate,
  onSignIn,
  prompt = 'How full is it?',
  emptyText = 'No reports yet today',
  timeLabel = 'reported',
  scaleHint = '1 means empty and 5 means very full.',
  groupLabel = 'Fullness from 1, empty, to 5, very full',
  levels = FULLNESS_LEVELS,
  confirmUpdate = false,
}) {
  const [busy, setBusy] = useState(false)
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState(null)
  const report = placeReport(summary, place.id)
  const mine = report?.mine ?? null
  const showScale = user && (!confirmUpdate || editing)

  useEffect(() => {
    setEditing(false)
  }, [place.id])

  async function choose(rating) {
    setBusy(true)
    setError(null)
    try {
      await onRate(rating)
      if (confirmUpdate) setEditing(false)
    } catch (err) {
      setError(err.message || 'Could not save your rating.')
    } finally {
      setBusy(false)
    }
  }

  const reportedAt = formatReportedAt(report?.reportedAt)
  const today = report
    ? `${report.rating} of 5${reportedAt ? `, ${timeLabel} ${reportedAt}` : ''}`
    : emptyText

  return (
    <section className="absolute bottom-4 left-4 right-16 z-[1000] bg-white border border-line rounded-lg shadow-card p-3 text-left">
      <p className="text-[13px] font-bold text-ink leading-[1.4]">
        {mapLabel(place)} · {place.name}
      </p>
      <p className="mt-0.5 text-[13px] text-muted leading-[1.4]">{prompt} {today}</p>
      {showScale ? (
        <div className="mt-2">
          {confirmUpdate && (
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="mb-1.5 h-8 px-3 rounded-md border border-line bg-white text-[13px] font-bold text-ink"
            >
              Cancel
            </button>
          )}
          <div className="flex gap-1.5" role="group" aria-label={groupLabel}>
            {levels.map((level) => {
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
      ) : user ? (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="mt-2 h-8 px-3 rounded-md border border-line bg-white text-[13px] font-bold text-ink"
        >
          Update
        </button>
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
        {showScale ? `${scaleHint} ` : ''}
        Rankings reset each day.
        {error ? ` ${error}` : ''}
      </p>
    </section>
  )
}
