import { useMemo, useState } from 'react'
import { eventDayKey, formatDayKey } from './useEvents'

const WEEKDAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const MONTH_LABELS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function parseDayKey(dayKey) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dayKey ?? '')
  if (!match) return null
  return { year: Number(match[1]), month: Number(match[2]) - 1 }
}

function toDayKey(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

// Month grid showing which days have events. Selecting a day filters the
// list below to that day; the list itself stays rendered by EventsScreen.
export default function EventCalendar({ events, selectedDay, onSelectDay }) {
  const counts = useMemo(() => {
    const map = new Map()
    for (const event of events ?? []) {
      const key = eventDayKey(event)
      if (!key) continue
      map.set(key, (map.get(key) ?? 0) + 1)
    }
    return map
  }, [events])

  const autoCursor = useMemo(() => {
    if (selectedDay) return parseDayKey(selectedDay)
    for (const event of events ?? []) {
      const parsed = parseDayKey(eventDayKey(event))
      if (parsed) return parsed
    }
    const today = new Date()
    return { year: today.getFullYear(), month: today.getMonth() }
  }, [events, selectedDay])

  // User-driven month navigation wins over the derived cursor; picking a
  // day clears the override so the grid follows the selection.
  const [override, setOverride] = useState(null)
  const cursor = useMemo(
    () => override ?? autoCursor ?? { year: 2026, month: 9 },
    [override, autoCursor],
  )

  function shiftMonth(delta) {
    const base = override ?? autoCursor ?? { year: 2026, month: 9 }
    const date = new Date(base.year, base.month + delta, 1)
    setOverride({ year: date.getFullYear(), month: date.getMonth() })
  }

  function goToToday() {
    const today = new Date()
    setOverride({ year: today.getFullYear(), month: today.getMonth() })
  }

  function toggleDay(dayKey) {
    setOverride(null)
    onSelectDay?.(selectedDay === dayKey ? null : dayKey)
  }

  const firstWeekday = new Date(cursor.year, cursor.month, 1).getDay()
  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate()
  const todayKey = toDayKey(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())
  const cells = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  const daysWithEvents = useMemo(() => {
    let n = 0
    counts.forEach((_, key) => {
      if (key.startsWith(`${cursor.year}-${String(cursor.month + 1).padStart(2, '0')}`)) n += 1
    })
    return n
  }, [counts, cursor])

  const selectedCount = selectedDay ? counts.get(selectedDay) ?? 0 : 0

  return (
    <section aria-label="Events calendar" className="border border-line rounded-xl p-4 shadow-card bg-white">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => shiftMonth(-1)}
          aria-label="Previous month"
          className="w-11 h-11 rounded-lg border border-line bg-white flex items-center justify-center font-bold"
        >
          ‹
        </button>
        <h3 className="text-base font-bold tracking-tight leading-[1.4] tnum">
          {MONTH_LABELS[cursor.month]} {cursor.year}
        </h3>
        <button
          type="button"
          onClick={() => shiftMonth(1)}
          aria-label="Next month"
          className="w-11 h-11 rounded-lg border border-line bg-white flex items-center justify-center font-bold"
        >
          ›
        </button>
      </div>

      <button
        type="button"
        onClick={goToToday}
        className="mt-2 text-[12px] font-semibold text-body underline underline-offset-2"
      >
        Jump to today
      </button>

      <div className="mt-3 grid grid-cols-7 gap-1" role="grid" aria-label={`${MONTH_LABELS[cursor.month]} ${cursor.year}`}>
        {WEEKDAY_LABELS.map((label) => (
          <span key={label} className="h-8 flex items-center justify-center text-[11px] font-bold uppercase tracking-[0.06em] text-muted">
            {label}
          </span>
        ))}
        {cells.map((day, index) => {
          if (day === null) return <span key={`blank-${index}`} />
          const key = toDayKey(cursor.year, cursor.month, day)
          const count = counts.get(key) ?? 0
          const isSelected = selectedDay === key
          const isToday = todayKey === key
          return (
            <button
              key={key}
              type="button"
              role="gridcell"
              aria-selected={isSelected}
              aria-label={`${formatDayKey(key)}${count > 0 ? `, ${count} event${count === 1 ? '' : 's'}` : ', no events'}`}
              onClick={() => toggleDay(key)}
              className={`min-h-11 rounded-lg border px-1 py-1 flex flex-col items-center justify-center gap-0.5 tnum ${
                isSelected
                  ? 'bg-ink text-white border-ink font-bold'
                  : count > 0
                    ? 'bg-white border-line font-bold hover:border-ink'
                    : 'bg-white border-transparent text-muted hover:border-line'
              } ${isToday && !isSelected ? 'border-nku' : ''}`}
            >
              <span className="text-[13px] leading-[1.4]">{day}</span>
              {count > 0 && (
                <span
                  aria-hidden="true"
                  className={`h-1.5 rounded-full ${isSelected ? 'bg-nku' : 'bg-nkuDeep'}`}
                  style={{ width: `${Math.min(4 + count * 3, 20)}px` }}
                />
              )}
            </button>
          )
        })}
      </div>

      <p className="mt-3 text-[13px] text-muted leading-[1.5]">
        {daysWithEvents === 0
          ? 'No events this month.'
          : `${daysWithEvents} day${daysWithEvents === 1 ? '' : 's'} with events this month. Tap a day to filter the list.`}
      </p>

      {selectedDay && (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-canvas border border-line px-4 py-3">
          <p className="text-[13px] font-semibold leading-[1.5]">
            {formatDayKey(selectedDay)}{' '}
            <span className="font-normal text-muted tnum">
              ({selectedCount} event{selectedCount === 1 ? '' : 's'})
            </span>
          </p>
          <button
            type="button"
            onClick={() => toggleDay(selectedDay)}
            className="shrink-0 text-[12px] font-bold underline underline-offset-2"
          >
            Clear
          </button>
        </div>
      )}
    </section>
  )
}
