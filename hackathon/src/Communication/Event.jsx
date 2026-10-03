import { categoryTint, eventCategory, eventWhen, isRegistered } from './useEvents'

export default function Event({ event, onRegister, onOpen, userId, onEdit }) {
  const registered = isRegistered(event, userId)

  const category = eventCategory(event)
  const venue = event.description
    ? `${event.location} • ${event.description}`
    : event.location

  return (
    <article className="relative border border-line rounded-xl p-6 shadow-card bg-white">
      <button
        type="button"
        onClick={() => onEdit(event)}
        aria-label={`Edit ${event.title}`}
        className="absolute top-4 right-4 inline-flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-[12px] font-semibold text-body hover:bg-wash focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nku"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m16 4 4 4M4 20l4-.8L19 8a2.1 2.1 0 0 0-3-3L5 16l-1 4Z" />
        </svg>
        Edit
      </button>
      {category && (
        <div className="flex items-center gap-2 pr-20">
          <span className={`text-[12px] font-semibold border rounded-md px-3 py-2 ${categoryTint(category)}`}>
            {category}
          </span>
        </div>
      )}
      <h3 className="mt-4 text-base font-bold leading-[1.4]">
        <button
          type="button"
          className="text-left hover:text-nkuDeep focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nku"
          onClick={() => onOpen?.(event)}
        >
          {event.title}
        </button>
      </h3>
      <p className="mt-2 text-[15px] text-body leading-[1.6] max-w-[65ch]">{venue}</p>
      <div className="mt-4 pt-4 border-t border-line flex items-center justify-between gap-4">
        <span className="text-[13px] text-muted leading-[1.5] tnum">{eventWhen(event)}</span>
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
