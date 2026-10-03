import { useEffect, useMemo, useState } from 'react'
import Event from '../Communication/Event'
import EventCalendar from '../Communication/EventCalendar'
import EventDetailsModal from '../Communication/EventDetailsModal'
import EventModal from '../Communication/EventModal'
import { buildEventShareUrl, eventDayKey, formatDayKey, isPastEvent, isRegistered, parseEventHash, searchEvents, sortEventsByDate, useEvents } from '../Communication/useEvents'
import AppHeader from '../components/AppHeader'
import Toast from '../components/Toast'

function groupByDay(events) {
  const groups = []
  const byKey = new Map()
  for (const event of events) {
    const key = eventDayKey(event)
    if (!byKey.has(key)) {
      const group = { key, label: key ? formatDayKey(key) : 'Date to be announced', items: [] }
      byKey.set(key, group)
      groups.push(group)
    }
    byKey.get(key).items.push(event)
  }
  return groups
}

export default function EventsScreen({ onNavigate, user, sharedEventId, onSharedEventOpened }) {
  const { events, addEvent, updateEvent, deleteEvent, toggleRegister, addComment } = useEvents()
  const [query, setQuery] = useState('')
  const [view, setView] = useState('list')
  const [selectedDay, setSelectedDay] = useState(null)
  const [onlyMine, setOnlyMine] = useState(false)
  const [onlyPast, setOnlyPast] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [eventToEdit, setEventToEdit] = useState(null)
  const [selectedEventId, setSelectedEventId] = useState(null)
  const [toast, setToast] = useState(null)
  // Soonest upcoming event first; search keeps that order.
  const results = useMemo(() => sortEventsByDate(searchEvents(events, query)), [events, query])
  const mineCount = useMemo(() => results.filter((event) => isRegistered(event, user?.id)).length, [results, user?.id])
  const pastCount = useMemo(() => results.filter(isPastEvent).length, [results])
  // The two checkboxes combine: each checked box narrows the list further.
  const filtered = useMemo(() => results.filter((event) =>
    (!onlyMine || isRegistered(event, user?.id)) && (!onlyPast || isPastEvent(event)),
  ), [results, onlyMine, onlyPast, user?.id])
  const visibleResults = useMemo(() => {
    if (view === 'calendar' && selectedDay) return filtered.filter((event) => eventDayKey(event) === selectedDay)
    return filtered
  }, [filtered, view, selectedDay])
  const groups = useMemo(() => groupByDay(visibleResults), [visibleResults])
  const selectedEvent = events.find((event) => event.id === selectedEventId) ?? null
  const hasActiveFilters = query.trim() !== '' || onlyMine || onlyPast || selectedDay !== null

  // Open a shared-link event once the list has loaded, then consume it so
  // it doesn't pop open again on later visits. This intentionally syncs the
  // external shared-link state into local modal state exactly once.
  useEffect(() => {
    if (!sharedEventId || events.length === 0) return
    if (events.some((event) => event.id === sharedEventId)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedEventId(sharedEventId)
    } else {
      setToast('That event link is no longer available.')
    }
    onSharedEventOpened?.()
  }, [sharedEventId, events, onSharedEventOpened])

  function openEvent(eventId) {
    setSelectedEventId(eventId)
    try {
      window.history.replaceState(null, '', `#/events/${encodeURIComponent(eventId)}`)
    } catch {
      /* hash sync is best-effort */
    }
  }

  function closeDetails() {
    setSelectedEventId(null)
    try {
      if (parseEventHash()) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search)
      }
    } catch {
      /* hash sync is best-effort */
    }
  }

  async function handleShare(eventToShare) {
    const url = buildEventShareUrl(eventToShare.id)
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url)
      } else {
        const ta = document.createElement('textarea')
        ta.value = url
        ta.style.position = 'fixed'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
      setToast('Link copied ✓')
    } catch {
      setToast('Could not copy link.')
    }
  }

  function clearFilters() {
    setQuery('')
    setOnlyMine(false)
    setOnlyPast(false)
    setSelectedDay(null)
  }

  async function handlePost(newEvent) {
    try {
      await addEvent(newEvent)
      setIsModalOpen(false)
      setToast('Event posted')
    } catch {
      setToast('Could not post event.')
    }
  }

  async function handleUpdate(updatedEvent) {
    try {
      await updateEvent(updatedEvent)
      setIsModalOpen(false)
      setEventToEdit(null)
      setToast('Event updated')
    } catch {
      setToast('Could not update event.')
    }
  }

  async function handleDelete(eventToDelete) {
    if (!window.confirm(`Delete "${eventToDelete.title}"? This cannot be undone.`)) return
    try {
      await deleteEvent(eventToDelete.id)
      if (selectedEventId === eventToDelete.id) closeDetails()
      setToast('Event deleted')
    } catch (err) {
      setToast(err.message || 'Could not delete event.')
    }
  }

  return (
    <div className="screen h-full flex flex-col bg-canvas">
      <AppHeader onNavigate={onNavigate} />

      <div className="px-4 pt-4 text-left bg-white border-b border-line pb-4">
        <div className="w-full max-w-2xl mx-auto">
          <div className="flex items-center gap-2 bg-white border border-line rounded-lg px-4 h-14 shadow-card">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="1.8" strokeLinecap="round">
            <circle cx="11" cy="11" r="6.5" />
            <path d="m16 16 4.5 4.5" />
          </svg>
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setSelectedDay(null)
            }}
            placeholder="SEARCH events, workshops..."
            className="bg-transparent w-full text-[15px] leading-[1.6] font-medium text-ink placeholder:text-faint"
            aria-label="Search events"
          />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-1 rounded-lg bg-wash p-1" role="tablist" aria-label="Events view">
          <button
            type="button"
            role="tab"
            aria-selected={view === 'list'}
            onClick={() => setView('list')}
            className={`h-11 rounded-md text-[13px] font-bold tracking-wide ${
              view === 'list' ? 'bg-white shadow-card text-ink' : 'text-muted'
            }`}
          >
            LIST
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === 'calendar'}
            onClick={() => setView('calendar')}
            className={`h-11 rounded-md text-[13px] font-bold tracking-wide ${
              view === 'calendar' ? 'bg-white shadow-card text-ink' : 'text-muted'
            }`}
          >
            CALENDAR
          </button>
        </div>
        <p className="mt-2 text-[12px] text-muted leading-[1.5] tnum">
          Sorted by soonest · {filtered.length} event{filtered.length === 1 ? '' : 's'}
        </p>
        <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Event filters">
          <label
            className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-[13px] font-semibold cursor-pointer ${
              onlyMine ? 'bg-[#FFFBEB] border-nku text-ink' : 'bg-white border-line text-body'
            }`}
          >
            <input
              type="checkbox"
              checked={onlyMine}
              onChange={(e) => setOnlyMine(e.target.checked)}
              className="h-5 w-5 shrink-0 accent-nku"
              aria-label="Show only events I registered for"
            />
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m5 12.5 4.5 4.5L19 7.5" />
            </svg>
            My events
            <span className="font-normal text-muted tnum">({mineCount})</span>
          </label>
          <label
            className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-[13px] font-semibold cursor-pointer ${
              onlyPast ? 'bg-[#FFFBEB] border-nku text-ink' : 'bg-white border-line text-body'
            }`}
          >
            <input
              type="checkbox"
              checked={onlyPast}
              onChange={(e) => setOnlyPast(e.target.checked)}
              className="h-5 w-5 shrink-0 accent-nku"
              aria-label="Show only previous events"
            />
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
              <circle cx="12" cy="12" r="8.5" />
              <path d="M12 7.5V12l3 2" />
            </svg>
            Previous events
            <span className="font-normal text-muted tnum">({pastCount})</span>
          </label>
        </div>
        </div>
      </div>

      <main className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-4 py-4 space-y-4 pb-8 text-left w-full max-w-2xl md:mx-auto">
        {view === 'calendar' && (
          <EventCalendar events={filtered} selectedDay={selectedDay} onSelectDay={setSelectedDay} />
        )}
        {visibleResults.length === 0 && (
          <div className="text-left">
            <p className="text-[15px] text-muted leading-[1.6]">
              {onlyMine && onlyPast
                ? 'No previous events you registered for.'
                : onlyMine
                  ? 'You have not registered for any events yet.'
                  : onlyPast
                    ? 'No previous events.'
                    : selectedDay ? `No events on ${formatDayKey(selectedDay)}.` : 'No events found'}
            </p>
            {selectedDay && (
              <button
                type="button"
                onClick={() => setSelectedDay(null)}
                className="mt-2 text-[13px] font-bold underline underline-offset-2"
              >
                Show all dates
              </button>
            )}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-2 block text-[13px] font-bold underline underline-offset-2"
              >
                Clear search &amp; filters
              </button>
            )}
          </div>
        )}
        {groups.map((group) => (
          <section key={group.key ?? 'undated'} aria-label={group.label}>
            <div className="flex items-center gap-2">
              <span className="w-1 h-5 bg-nku rounded-full inline-block" aria-hidden="true" />
              <h2 className="text-[13px] font-bold tracking-wide leading-[1.4] tnum">
                {group.label}{' '}
                <span className="font-semibold text-muted">
                  ({group.items.length})
                </span>
              </h2>
            </div>
            <div className="mt-2 space-y-4">
              {group.items.map((event) => (
                <Event
                  key={event.id}
                  event={event}
                  user={user}
                  userId={user?.id}
                  onRegister={toggleRegister}
                  onOpen={(openedEvent) => openEvent(openedEvent.id)}
                  onShare={handleShare}
                  onEdit={(eventToUpdate) => {
                    setEventToEdit(eventToUpdate)
                    setIsModalOpen(true)
                  }}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </section>
        ))}
      </main>

      <footer className="shrink-0 bg-white border-t border-line p-4 sm:p-6 text-left">
        <div className="w-full max-w-2xl mx-auto">
          <button
            type="button"
            onClick={() => {
              setEventToEdit(null)
              setIsModalOpen(true)
            }}
            className="w-full h-14 px-8 rounded-lg bg-nku hover:bg-nkuDeep font-bold text-[15px] text-ink shadow-card active:scale-[0.99] transition"
          >
            + MAKE POST
          </button>
        </div>
      </footer>

      <EventModal
        isOpen={isModalOpen}
        eventToEdit={eventToEdit}
        onClose={() => {
          setIsModalOpen(false)
          setEventToEdit(null)
        }}
        onPost={handlePost}
        onUpdate={handleUpdate}
      />
      <EventDetailsModal
        event={selectedEvent}
        user={user}
        onClose={closeDetails}
        onAddComment={addComment}
        onRegister={toggleRegister}
        onShare={handleShare}
        onEdit={(eventToUpdate) => {
          closeDetails()
          setEventToEdit(eventToUpdate)
          setIsModalOpen(true)
        }}
        onDelete={handleDelete}
      />
      <Toast message={toast} onDone={() => setToast(null)} />
    </div>
  )
}
