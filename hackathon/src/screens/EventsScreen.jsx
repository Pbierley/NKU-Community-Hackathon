import { useState } from 'react'
import Event from '../Communication/Event'
import EventDetailsModal from '../Communication/EventDetailsModal'
import EventModal from '../Communication/EventModal'
import { searchEvents, useEvents } from '../Communication/useEvents'
import AppHeader from '../components/AppHeader'
import Toast from '../components/Toast'

export default function EventsScreen({ onNavigate, user }) {
  const { events, addEvent, toggleRegister, addComment } = useEvents()
  const [query, setQuery] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedEventId, setSelectedEventId] = useState(null)
  const [toast, setToast] = useState(null)
  const results = searchEvents(events, query)
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

  return (
    <div className="screen h-full flex flex-col bg-canvas">
      <AppHeader onNavigate={onNavigate} />

      <div className="px-4 pt-4 text-left bg-white border-b border-line pb-4">
        <div className="flex items-center gap-2 bg-white border border-line rounded-lg px-4 h-14 shadow-card">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="1.8" strokeLinecap="round">
            <circle cx="11" cy="11" r="6.5" />
            <path d="m16 16 4.5 4.5" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="SEARCH events, workshops..."
            className="bg-transparent w-full text-[15px] leading-[1.6] font-medium text-ink placeholder:text-faint"
            aria-label="Search events"
          />
        </div>
      </div>

      <main className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-4 py-4 space-y-4 pb-32 text-left">
        {results.length === 0 && (
          <p className="text-[15px] text-muted leading-[1.6]">No events found</p>
        )}
        {results.map((event) => (
          <Event
            key={event.id}
            event={event}
            userId={user?.id}
            onRegister={toggleRegister}
            onOpen={(openedEvent) => setSelectedEventId(openedEvent.id)}
          />
        ))}
      </main>

      <footer className="absolute bottom-0 inset-x-0 p-6 pt-8 bg-gradient-to-t from-white via-white to-transparent text-left">
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="w-full h-14 px-8 rounded-lg bg-nku hover:bg-nkuDeep font-bold text-[15px] text-ink shadow-card active:scale-[0.99] transition"
        >
          + MAKE POST
        </button>
        <div className="mx-auto mt-4 w-8 h-1 rounded-full bg-line" />
      </footer>

      <EventModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onPost={handlePost} />
      <EventDetailsModal
        event={selectedEvent}
        onClose={() => setSelectedEventId(null)}
        onAddComment={addComment}
      />
      <Toast message={toast} onDone={() => setToast(null)} />
    </div>
  )
}
