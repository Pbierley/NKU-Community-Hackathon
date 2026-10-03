import { categoryTint, eventCategory, eventWhen, useEvents } from '../Communication/useEvents'

export default function FeaturedEvents({ onNavigate }) {
  const { events } = useEvents()
  const featured = events.slice(0, 4)

  return (
    <section className="px-4 pt-4 pb-4 bg-white border-t border-line mt-4 text-left shrink-0" aria-label="Featured events">
      <div className="flex items-center justify-between gap-4 mb-2">
        <h2 className="text-base font-bold tracking-tight leading-[1.4] flex items-center gap-2">
          <span className="w-1 h-5 bg-nku rounded-full inline-block" />
          Featured events
        </h2>
        <button
          type="button"
          onClick={() => onNavigate('events')}
          className="text-[12px] font-semibold bg-ink text-white rounded-md px-3 py-2 shrink-0"
        >
          See All ({events.length})
        </button>
      </div>
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 snap-x">
        {featured.map((event) => (
          <article
            key={event.id}
            onClick={() => onNavigate('events')}
            className="cursor-pointer snap-start shrink-0 w-[68%] sm:w-[48%] md:w-[32%] lg:w-[24%] bg-white border border-line rounded-xl p-4 shadow-card"
          >
            {eventCategory(event) && (
              <span className={`inline-block text-[12px] font-semibold border rounded-md px-3 py-2 ${categoryTint(eventCategory(event))}`}>
                {eventCategory(event)}
              </span>
            )}
            <p className="mt-2 text-[13px] text-muted leading-[1.5] tnum">{eventWhen(event)}</p>
            <h3 className="mt-1 text-[15px] font-bold leading-[1.5]">{event.title}</h3>
            <p className="mt-1 text-[13px] text-muted leading-[1.5]">{event.location}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
