import { attendeeCount, categoryTint, eventCategory, eventWhen, isEventCreator, isRegistered } from './useEvents'

export default function Event({ event, onRegister, onOpen, userId, user, onEdit, onDelete }) {
  const currentUserId = user?.id ?? userId
  const registered = isRegistered(event, currentUserId)
  const canModify = isEventCreator(event, currentUserId)
  const totalAttendees = attendeeCount(event)

  const category = eventCategory(event)
  const venue = event.description
    ? `${event.location} • ${event.description}`
    : event.location

  return (
    <article className="relative flex flex-col border border-line rounded-xl p-4 sm:p-6 shadow-card bg-white">
      {canModify && (
        <div className="self-end flex flex-wrap items-center justify-end gap-2 sm:absolute sm:top-4 sm:right-4">
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
          <button
            type="button"
            onClick={() => onDelete?.(event)}
            aria-label={`Delete ${event.title}`}
            className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-2.5 py-1.5 sm:px-3 sm:py-2 text-[12px] font-semibold text-red-700 hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m-9 0 1 13h10l1-13" />
            </svg>
            Delete
          </button>
        </div>
      )}
      {category && (
        <div className={`flex items-center gap-2 ${canModify ? 'mt-3 sm:mt-0 sm:pr-40' : ''}`}>
          <span className={`text-[12px] font-semibold border rounded-md px-3 py-2 ${categoryTint(category)}`}>
            {category}
          </span>
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
    </article>
  )
}
