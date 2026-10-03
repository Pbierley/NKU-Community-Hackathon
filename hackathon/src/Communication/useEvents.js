import { useEffect, useState } from 'react'
import { apiUrl } from '../api'
import { canModerateEvents, isDeveloper } from '../auth/accountTypes'
import { getAuthToken } from '../auth/useAuth'

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

export function isRegistered(event, userId) {
  if (userId) return event.attendeeIds?.includes(userId)
  // Logged-out fallback: match legacy demo ids so the UI still toggles.
  return event.attendeeIds?.includes('current-user')
}

// Total attendees for an event, tolerant of older shapes.
export function attendeeCount(event) {
  if (Array.isArray(event?.attendeeIds)) return event.attendeeIds.length
  if (Array.isArray(event?.attendees)) return event.attendees.length
  if (typeof event?.attendeeCount === 'number') return event.attendeeCount
  if (typeof event?.attendees === 'number') return event.attendees
  return 0
}

export function eventCreatorId(event) {
  return event?.creatorId ?? event?.createdBy ?? event?.authorId ?? event?.userId ?? null
}

// True when `user` created the event. Accepts either a user object or a raw
// id so call sites can pass whichever is handy. Legacy seed events carry no
// creator info, so they never match — nobody sees edit/delete for them.
export function isEventCreator(event, userOrId) {
  const userId = typeof userOrId === 'object' ? userOrId?.id : userOrId
  if (!event || !userId) return false
  return eventCreatorId(event) === userId
}

export function canEditEvent(event, user) {
  if (isDeveloper(user)) return true
  return isEventCreator(event, user)
}

export function canDeleteEvent(event, user) {
  if (canModerateEvents(user)) return true
  return isEventCreator(event, user)
}

// Display name for a comment, tolerant of older shapes that stored the
// author under different keys.
export function commentAuthor(comment) {
  return (
    comment?.author ||
    comment?.authorName ||
    comment?.name ||
    comment?.userName ||
    comment?.createdBy ||
    'Anonymous'
  )
}

function authHeaders(extra = {}) {
  const token = getAuthToken()
  return token ? { ...extra, Authorization: `Bearer ${token}` } : extra
}

export function useEvents() {
  const [events, setEvents] = useState([])
  const [error, setError] = useState(null)

  useEffect(() => {
    const controller = new AbortController()
    fetch(apiUrl('/api/events'), { signal: controller.signal })
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
    const res = await fetch(apiUrl('/api/events'), {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(newEvent),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.error || 'Could not post event.')
    }
    const saved = await res.json()
    setEvents((current) => [saved, ...current])
    return saved
  }

  async function updateEvent(updatedEvent) {
    const res = await fetch(apiUrl(`/api/events/${encodeURIComponent(updatedEvent.id)}`), {
      method: 'PATCH',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(updatedEvent),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.error || 'Could not update event.')
    }
    const saved = await res.json()
    setEvents((current) => current.map((event) => (event.id === saved.id ? saved : event)))
    return saved
  }

  async function deleteEvent(eventId) {
    const res = await fetch(apiUrl(`/api/events/${encodeURIComponent(eventId)}`), {
      method: 'DELETE',
      headers: authHeaders(),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.error || 'Could not delete event.')
    }
    setEvents((current) => current.filter((event) => event.id !== eventId))
  }

  async function toggleRegister(eventId) {
    const token = getAuthToken()
    const res = await fetch(apiUrl(`/api/events/${encodeURIComponent(eventId)}/register`), {
      method: 'PATCH',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok) throw new Error('Could not update registration.')
    const saved = await res.json()
    setEvents((current) => current.map((event) => (event.id === saved.id ? saved : event)))
    return saved
  }

  async function addComment(eventId, text) {
    const res = await fetch(apiUrl(`/api/events/${encodeURIComponent(eventId)}/comments`), {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ text }),
    })
    if (!res.ok) throw new Error('Could not add comment.')
    const comment = await res.json()
    setEvents((current) => current.map((event) => (
      event.id === eventId
        ? { ...event, comments: [...(event.comments ?? []), comment] }
        : event
    )))
    return comment
  }

  return { events, error, addEvent, updateEvent, deleteEvent, toggleRegister, addComment }
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

// ─── Dates: soonest-first sorting + calendar grouping ───────────────
// Events carry human-written `date` ("October 5, 2026") and `time`
// ("11 AM - 2 PM") strings, so parsing has to be forgiving. Anything
// without a readable date sorts after dated events.

function parseDateTime(value) {
  if (!value) return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const TIME_RE = /(\d{1,2})(?::(\d{2}))?\s*([AP])\.?\s*M\.?/i
const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

function applyTime(base, timeText) {
  const match = String(timeText ?? '').match(TIME_RE)
  if (!match) return base
  let hours = Number(match[1]) % 12
  if (match[3].toUpperCase() === 'P') hours += 12
  const out = new Date(base)
  out.setHours(hours, Number(match[2] ?? 0), 0, 0)
  return out
}

function relativeWhen(text) {
  // Handles legacy `when` labels like "Today, 6:00 PM", "Tomorrow, 7:00 PM"
  // and "Thu, 11:00 AM" (next occurrence of that weekday).
  const match = String(text ?? '').match(/^\s*(today|tomorrow|[a-z]{3,9})[,.]?\s*(.*)$/i)
  if (!match) return null
  const word = match[1].toLowerCase()
  const now = new Date()
  const base = new Date(now)
  base.setHours(0, 0, 0, 0)
  if (word === 'tomorrow') {
    base.setDate(base.getDate() + 1)
  } else if (word !== 'today') {
    const target = WEEKDAYS.findIndex((day) => day === word || day.startsWith(word.slice(0, 3)))
    if (target < 0) return null
    let delta = (target - base.getDay() + 7) % 7
    if (delta === 0 && applyTime(base, match[2]) <= now) delta = 7
    base.setDate(base.getDate() + delta)
  }
  if (!TIME_RE.test(match[2])) return base
  return applyTime(base, match[2])
}

// Start of the event as a Date, or null when it has no readable date/time.
export function eventStart(event) {
  if (!event) return null
  for (const key of ['startAt', 'startsAt', 'start', 'datetime', 'dateTime']) {
    const parsed = event[key] != null && !(typeof event[key] === 'string' && !event[key].trim())
      ? parseDateTime(event[key])
      : null
    if (parsed) return parsed
  }
  if (event.when) {
    const direct = parseDateTime(event.when)
    if (direct) return direct
    const relative = relativeWhen(event.when)
    if (relative) return relative
  }
  const rawDate = typeof event.date === 'string' ? event.date.trim() : event.date
  const day = parseDateTime(rawDate)
  if (!day) return null
  const startText = String(event.time ?? '').split(/\s+-\s+/)[0].trim()
  if (!startText || !TIME_RE.test(startText)) return day
  return applyTime(day, startText)
}

// Calendar day key "YYYY-MM-DD" (local time) for grouping, or null.
export function eventDayKey(event) {
  const start = eventStart(event)
  if (!start) return null
  const month = String(start.getMonth() + 1).padStart(2, '0')
  const day = String(start.getDate()).padStart(2, '0')
  return `${start.getFullYear()}-${month}-${day}`
}

export function formatDayKey(dayKey) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dayKey ?? '')
  if (!match) return dayKey ?? ''
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

// ─── Shareable event links ────────────────────────────────────────────
// Links look like `<origin><path>#/events/<id>`. The hash never reaches
// the server, so no routing or backend changes are needed to support them.

// Extract an event id from a `#/events/<id>` hash; null when absent.
export function parseEventHash(hash) {
  const raw = hash ?? (typeof window === 'undefined' ? '' : window.location.hash)
  const match = /^#\/events\/([^/?#]+)\/?$/.exec(raw ?? '')
  if (!match) return null
  try {
    return decodeURIComponent(match[1]) || null
  } catch {
    return null
  }
}

// Build an absolute share URL for an event id.
export function buildEventShareUrl(eventId) {
  const origin = typeof window === 'undefined' ? '' : window.location.origin
  const path = typeof window === 'undefined' ? '/' : window.location.pathname
  return `${origin}${path}#/events/${encodeURIComponent(eventId)}`
}

// True when the event started before today (same cutoff as
// sortEventsByDate). Undated events are never "past".
export function isPastEvent(event) {
  const start = eventStart(event)
  if (!start) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return start.getTime() < today.getTime()
}

// Soonest upcoming event first. Past events sink to the bottom (most
// recent past first) and undated events sit between the two groups.
export function sortEventsByDate(input) {
  const events = Array.isArray(input) ? input : []
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const cutoff = today.getTime()
  const upcoming = []
  const undated = []
  const past = []
  events.forEach((event, index) => {
    const start = eventStart(event)
    if (!start) {
      undated.push({ event, index })
    } else if (start.getTime() < cutoff) {
      past.push({ event, time: start.getTime(), index })
    } else {
      upcoming.push({ event, time: start.getTime(), index })
    }
  })
  upcoming.sort((a, b) => a.time - b.time || a.index - b.index)
  past.sort((a, b) => b.time - a.time || a.index - b.index)
  return [
    ...upcoming.map((entry) => entry.event),
    ...undated.map((entry) => entry.event),
    ...past.map((entry) => entry.event),
  ]
}
