import { useMemo, useState } from 'react'
import Event from '../Communication/Event'
import EventCalendar from '../Communication/EventCalendar'
import EventDetailsModal from '../Communication/EventDetailsModal'
import EventModal from '../Communication/EventModal'
import { eventDayKey, formatDayKey, searchEvents, sortEventsByDate, useEvents } from '../Communication/useEvents'
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

export default function EventsScreen({ onNavigate, user }) {
  const { events, addEvent, updateEvent, deleteEvent, toggleRegister, addComment } = useEvents()
  const [query, setQuery] = useState('')
  const [view, setView] = useState('list')
  const [selectedDay, setSelectedDay] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [eventToEdit, setEventToEdit] = useState(null)
  const [selectedEventId, setSelectedEventId] = useState(null)
  const [toast, setToast] = useState(null)
  // Soonest upcoming event first; search keeps that order.
  const results = useMemo(() => sortEventsByDate(searchEvents(events, query)), [events, query])
  const visibleResults = useMemo(() => {
    if (view === 'calendar' && selectedDay) return results.filter((event) => eventDayKey(event) === selectedDay)
    return results
  }, [results, view, selectedDay])
  const groups = useMemo(() => groupByDay(visibleResults), [visibleResults])
  const selectedEvent = events.find((event) => event.id === selectedEventId) ?? null

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
      if (selectedEventId === eventToDelete.id) setSelectedEventId(null)
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
          Sorted by soonest · {results.length} event{results.length === 1 ? '' : 's'}
        </p>
        </div>
      </div>

      <main className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-4 py-4 space-y-4 pb-32 text-left w-full max-w-2xl md:mx-auto">
        {view === 'calendar' && (
          <EventCalendar events={results} selectedDay={selectedDay} onSelectDay={setSelectedDay} />
        )}
        {visibleResults.length === 0 && (
          <div className="text-left">
            <p className="text-[15px] text-muted leading-[1.6]">
              {selectedDay ? `No events on ${formatDayKey(selectedDay)}.` : 'No events found'}
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
                  onOpen={(openedEvent) => setSelectedEventId(openedEvent.id)}
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

      <footer className="absolute bottom-0 inset-x-0 p-6 pt-8 bg-gradient-to-t from-white via-white to-transparent text-left">
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
        <div className="mx-auto mt-4 w-8 h-1 rounded-full bg-line" />
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
        onClose={() => setSelectedEventId(null)}
        onAddComment={addComment}
        onRegister={toggleRegister}
        onEdit={(eventToUpdate) => {
          setSelectedEventId(null)
          setEventToEdit(eventToUpdate)
          setIsModalOpen(true)
        }}
        onDelete={handleDelete}
      />
      <Toast message={toast} onDone={() => setToast(null)} />
    </div>
  )
}
