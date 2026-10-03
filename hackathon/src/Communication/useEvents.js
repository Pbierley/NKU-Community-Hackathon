import { useEffect, useState } from 'react'

const CURRENT_USER = 'current-user'

const CATEGORY_TINTS = {
  Athletics: 'bg-[#FFFBEB] text-[#92400E] border-[#FDE68A]',
  Sports: 'bg-[#FFFBEB] text-[#92400E] border-[#FDE68A]',
  Games: 'bg-[#FFFBEB] text-[#92400E] border-[#FDE68A]',
  Social: 'bg-[#FFFBEB] text-[#92400E] border-[#FDE68A]',
  Arts: 'bg-[#F5F3FF] text-[#5B21B6] border-[#DDD6FE]',
  Music: 'bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]',
  Clubs: 'bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]',
  Campus: 'bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]',
  Students: 'bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]',
  Career: 'bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]',
  'Tech / Hack': 'bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]',
  Tech: 'bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]',
  'Computer Science': 'bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]',
  Study: 'bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]',
  Academics: 'bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]',
}

export function eventCategory(event) {
  return event.category ?? event.tags?.[0] ?? 'Campus'
}

export function eventWhen(event) {
  if (event.when) return event.when
  return [event.date, event.time].filter(Boolean).join(' • ') || 'Upcoming'
}

export function categoryTint(category) {
  return CATEGORY_TINTS[category] ?? 'bg-wash text-body border-line'
}

export function isRegistered(event) {
  return event.attendeeIds?.includes(CURRENT_USER)
}

export function useEvents() {
  const [events, setEvents] = useState([])
  const [error, setError] = useState(null)

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/events', { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`Server responded ${res.status}`)
        return res.json()
      })
      .then((docs) => {
        setEvents(docs)
        setError(null)
      })
      .catch((err) => {
        if (err.name === 'AbortError') return
        setError(`Could not load events: ${err.message}`)
      })
    return () => controller.abort()
  }, [])

  async function addEvent(newEvent) {
    const res = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newEvent),
    })
    if (!res.ok) throw new Error('Could not post event.')
    const saved = await res.json()
    setEvents((current) => [saved, ...current])
    return saved
  }

  async function toggleRegister(eventId) {
    const res = await fetch(`/api/events/${encodeURIComponent(eventId)}/register`, { method: 'PATCH' })
    if (!res.ok) throw new Error('Could not update registration.')
    const saved = await res.json()
    setEvents((current) => current.map((event) => (event.id === saved.id ? saved : event)))
  }

  return { events, error, addEvent, toggleRegister }
}

export function searchEvents(events, query) {
  const q = query.trim().toLowerCase()
  if (!q) return events
  return events.filter((event) => {
    const hay = [event.title, event.location, event.description, eventCategory(event), ...(event.tags ?? [])]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return hay.includes(q)
  })
}
