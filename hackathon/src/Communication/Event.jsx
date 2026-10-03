import { categoryTint, eventCategory, eventWhen, isRegistered } from './useEvents'

export default function Event({ event, onRegister, userId }) {
  const registered = isRegistered(event, userId)
  const category = eventCategory(event)
  const venue = event.description
    ? `${event.location} • ${event.description}`
    : event.location

  return (
    <article className="border border-line rounded-xl p-6 shadow-card bg-white">
      {category && (
        <div className="flex items-center gap-2">
          <span className={`text-[12px] font-semibold border rounded-md px-3 py-2 ${categoryTint(category)}`}>
            {category}
          </span>
        </div>
      )}
      <h3 className="mt-4 text-base font-bold leading-[1.4]">{event.title}</h3>
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
      {event.comments?.length > 0 && (
        <div className="mt-4 space-y-2">
          {event.comments.map((comment) => (
            <p key={comment.id} className="text-[13px] text-muted leading-[1.5]">
              <span className="font-semibold text-body">{comment.author}</span>
              {` ${comment.text}`}
            </p>
          ))}
        </div>
      )}
    </article>
  )
}
