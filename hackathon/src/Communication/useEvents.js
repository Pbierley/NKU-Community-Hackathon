import { useEffect, useState } from 'react'
import defaultEvents from './events.json'

const STORAGE_KEY = 'nku-events'
const CURRENT_USER = 'current-user'

const CATEGORY_TINTS = {
  Athletics: 'bg-[#FFFBEB] text-[#92400E] border-[#FDE68A]',
  Sports: 'bg-[#FFFBEB] text-[#92400E] border-[#FDE68A]',
  Arts: 'bg-[#F5F3FF] text-[#5B21B6] border-[#DDD6FE]',
  Music: 'bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]',
  Career: 'bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]',
  'Tech / Hack': 'bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]',
  Tech: 'bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]',
  Campus: 'bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]',
}

export function categoryTint(category) {
  return CATEGORY_TINTS[category] ?? 'bg-wash text-body border-line'
}

export function isRegistered(event) {
  return event.attendeeIds?.includes(CURRENT_USER)
}

function readStoredEvents() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? JSON.parse(saved) : defaultEvents
  } catch {
    return defaultEvents
  }
}

export function useEvents() {
  const [events, setEvents] = useState(readStoredEvents)

  useEffect(() => {
    if (events.length > 0) localStorage.setItem(STORAGE_KEY, JSON.stringify(events))
  }, [events])

  function addEvent(newEvent) {
    setEvents((current) => [newEvent, ...current])
  }

  function toggleRegister(eventId) {
    setEvents((current) =>
      current.map((event) => {
        if (event.id !== eventId) return event
        const ids = event.attendeeIds ?? []
        return {
          ...event,
          attendeeIds: isRegistered(event)
            ? ids.filter((id) => id !== CURRENT_USER)
            : [...ids, CURRENT_USER],
        }
      }),
    )
  }

  return { events, addEvent, toggleRegister }
}

export function searchEvents(events, query) {
  const q = query.trim().toLowerCase()
  if (!q) return events
  return events.filter((event) => {
    const hay = [event.title, event.location, event.description, event.category]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return hay.includes(q)
  })
}
