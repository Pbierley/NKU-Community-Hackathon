import { useState } from 'react'
import { attendeeCount, categoryTint, eventCategory, eventWhen, canDeleteEvent, canEditEvent, isEventCreator, isRegistered } from './useEvents'

function eventPhotos(event) {
  if (!Array.isArray(event?.images)) return []
  return event.images.filter((src) => typeof src === 'string' && src.trim())
}

function EventPhotos({ event, onOpen }) {
  const photos = eventPhotos(event)
  const [failed, setFailed] = useState(() => new Set())
  const visible = photos.filter((_, index) => !failed.has(index))
  if (visible.length === 0) return null

  function hide(index) {
    setFailed((current) => {
      const next = new Set(current)
      next.add(index)
      return next
    })
  }

  return (
    <div className="grid grid-cols-2 gap-px bg-line">
      {photos.map((src, index) => {
        if (failed.has(index)) return null
        const firstVisible = photos.findIndex((_, photoIndex) => !failed.has(photoIndex))
        const span = visible.length === 1 || (visible.length % 2 === 1 && index === firstVisible)
        return (
          <button
            key={`${src}-${index}`}
            type="button"
            onClick={() => onOpen?.(event)}
            className={`block min-w-0 bg-wash ${span ? 'col-span-2' : ''}`}
            aria-label={`View ${event.title}`}
          >
            <img
              src={src}
              alt={`${event.title} photo ${index + 1}`}
              className={`w-full object-cover ${span ? 'h-48 sm:h-56' : 'h-28 sm:h-32'}`}
              loading="lazy"
              onError={() => hide(index)}
            />
          </button>
        )
      })}
    </div>
  )
}

export default function Event({ event, onRegister, onOpen, onShare, onShowOnMap, userId, user, onEdit, onDelete }) {
  const currentUserId = user?.id ?? userId
  const registered = isRegistered(event, currentUserId)
  const canEdit = canEditEvent(event, user)
  const canRemove = canDeleteEvent(event, user)
  const removeLabel = isEventCreator(event, user) ? 'Delete' : 'Take down'
  const totalAttendees = attendeeCount(event)

  const category = eventCategory(event)
  const venue = event.description
    ? `${event.location} • ${event.description}`
    : event.location

  return (
    <article className="relative flex flex-col overflow-hidden border border-line rounded-xl shadow-card bg-white">
      <EventPhotos event={event} onOpen={onOpen} />
      <div className="relative flex flex-col p-4 sm:p-6">
      {(canEdit || canRemove) && (
        <div className="self-end flex flex-wrap items-center justify-end gap-2 sm:absolute sm:top-4 sm:right-4">
          {canEdit && (
            <button
              type="button"
              onClick={() => onEdit?.(event)}
              aria-label={`Edit ${event.title}`}
              className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-2.5 py-1.5 sm:px-3 sm:py-2 text-[12px] font-semibold text-body hover:bg-wash focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nku"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m16 4 4 4M4 20l4-.8L19 8a2.1 2.1 0 0 0-3-3L5 16l-1 4Z" />
              </svg>
              Edit
            </button>
          )}
          {canRemove && (
            <button
              type="button"
              onClick={() => onDelete?.(event)}
              aria-label={`${removeLabel} ${event.title}`}
              className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-2.5 py-1.5 sm:px-3 sm:py-2 text-[12px] font-semibold text-red-700 hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m-9 0 1 13h10l1-13" />
              </svg>
              {removeLabel}
            </button>
          )}
        </div>
      )}
      {(category || event.location) && (
        <div className={`flex flex-wrap items-center gap-2 ${canEdit || canRemove ? 'mt-3 sm:mt-0 sm:pr-40' : ''}`}>
          {category && (
            <span className={`text-[12px] font-semibold border rounded-md px-3 py-2 ${categoryTint(category)}`}>
              {category}
            </span>
          )}
          {event.location && (
            <button
              type="button"
              onClick={() => onShowOnMap?.(event)}
              title={`Show ${event.location} on the map`}
              className="min-w-0 text-left text-[12px] font-semibold border border-line rounded-md px-3 py-2 text-body hover:bg-wash focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nku"
            >
              <span className="text-muted">@ </span>
              {event.location}
            </button>
          )}
        </div>
      )}
      <h3 className="mt-4 text-base font-bold leading-[1.4] break-words">
        <button
          type="button"
          className="text-left hover:text-nkuDeep focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nku"
          onClick={() => onOpen?.(event)}
        >
          {event.title}
        </button>
      </h3>
      <p className="mt-2 text-[15px] text-body leading-[1.6] max-w-[65ch] break-words">{venue}</p>
      <div className="mt-4 pt-4 border-t border-line flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <span className="text-[13px] text-muted leading-[1.5] tnum min-w-0">
          {eventWhen(event)}
          <span className="ml-2 font-semibold text-body" aria-live="polite">
            · {totalAttendees} attending
          </span>
        </span>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onShare?.(event)}
            aria-label={`Copy link to ${event.title}`}
            title="Copy link"
            className="rounded-md border border-line bg-white px-3 py-2 text-body hover:bg-wash focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nku"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1.5 1.5M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1.5-1.5" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => onRegister(event.id)}
            className={`text-[13px] font-bold rounded-md px-4 py-2 ${
              registered ? 'bg-nku text-ink' : 'bg-ink text-white'
            }`}
          >
            {registered ? 'Registered ✓' : 'Register'}
          </button>
        </div>
      </div>
      </div>
    </article>
  )
}
