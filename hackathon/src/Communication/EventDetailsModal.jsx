import { useState } from 'react'
import { attendeeCount, commentAuthor, eventWhen, isEventCreator, isRegistered } from './useEvents'

export default function EventDetailsModal({ event, user, onClose, onAddComment, onEdit, onDelete, onRegister }) {
  const [commentText, setCommentText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [isRegistering, setIsRegistering] = useState(false)
  const [registerError, setRegisterError] = useState('')
  const canModify = isEventCreator(event, user)
  const currentUserId = user?.id
  const registered = event ? isRegistered(event, currentUserId) : false
  const totalAttendees = attendeeCount(event)

  if (!event) return null

  async function handleRegister() {
    if (!onRegister || isRegistering) return
    setIsRegistering(true)
    setRegisterError('')
    try {
      await onRegister(event.id)
    } catch {
      setRegisterError('Could not update registration. Please try again.')
    } finally {
      setIsRegistering(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const text = commentText.trim()
    if (!text) return

    setIsSubmitting(true)
    setError('')
    try {
      await onAddComment(event.id, text)
      setCommentText('')
    } catch {
      setError('Could not add your comment. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="absolute inset-0 z-[80] flex items-end sm:items-center justify-center sm:p-6">
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(17,24,39,0.45)', backdropFilter: 'blur(8px)' }}
        onClick={onClose}
      />
      <section
        className="relative w-full sm:max-w-2xl max-h-[90%] overflow-y-auto no-scrollbar bg-white border border-line rounded-t-xl sm:rounded-xl p-4 sm:p-6 shadow-card text-left"
        role="dialog"
        aria-modal="true"
        aria-labelledby="event-details-title"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[13px] text-muted leading-[1.5]">{eventWhen(event)}</p>
            <h2 id="event-details-title" className="mt-1 text-xl font-bold leading-[1.3] text-ink break-words">
              {event.title}
            </h2>
            <p className="mt-2 text-[14px] text-body leading-[1.5] break-words">{event.location}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close event details"
            className="w-11 h-11 shrink-0 rounded-lg border border-line bg-white flex items-center justify-center"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        {event.description && (
          <p className="mt-5 text-[15px] text-body leading-[1.6] whitespace-pre-wrap break-words">{event.description}</p>
        )}

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-wash px-4 py-3">
          <p className="text-[13px] font-semibold text-body tnum" aria-live="polite">
            <span aria-hidden="true">👥 </span>
            {totalAttendees} attendee{totalAttendees === 1 ? '' : 's'}
            {registered && <span className="ml-2 font-normal text-muted">· You&apos;re in ✓</span>}
          </p>
          <button
            type="button"
            onClick={handleRegister}
            disabled={isRegistering}
            className={`text-[13px] font-bold rounded-md px-4 py-2 disabled:cursor-not-allowed disabled:opacity-50 ${
              registered ? 'bg-nku text-ink' : 'bg-ink text-white'
            }`}
          >
            {isRegistering ? 'Saving…' : registered ? 'Registered ✓' : 'Register'}
          </button>
        </div>
        {registerError && <p className="mt-2 text-[13px] text-red-700" role="alert">{registerError}</p>}

        {canModify && (
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onEdit?.(event)}
              className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-4 py-2 text-[13px] font-semibold text-body hover:bg-wash"
            >
              Edit event
            </button>
            <button
              type="button"
              onClick={() => onDelete?.(event)}
              className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-4 py-2 text-[13px] font-semibold text-red-700 hover:bg-red-50"
            >
              Delete event
            </button>
          </div>
        )}

        {event.tags?.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {event.tags.map((tag) => (
              <span key={tag} className="rounded-md border border-line bg-wash px-3 py-1 text-[12px] font-semibold text-body">
                {tag}
              </span>
            ))}
          </div>
        )}

        {event.images?.length > 0 && (
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {event.images.map((image, index) => (
              <img
                key={`${image}-${index}`}
                src={image}
                alt={`${event.title} image ${index + 1}`}
                className="max-h-72 w-full rounded-lg border border-line object-cover"
                loading="lazy"
              />
            ))}
          </div>
        )}

        <section className="mt-6 border-t border-line pt-5" aria-labelledby="event-comments-title">
          <h3 id="event-comments-title" className="text-base font-bold text-ink">
            Comments <span className="font-normal text-muted">({event.comments?.length ?? 0})</span>
          </h3>
          <div className="mt-3 space-y-3">
            {event.comments?.length ? event.comments.map((comment) => (
              <article key={comment.id} className="rounded-lg bg-wash px-4 py-3">
                <p className="text-[13px] font-semibold text-body">{commentAuthor(comment)}</p>
                <p className="mt-1 text-[14px] text-body leading-[1.5] whitespace-pre-wrap break-words">{comment.text}</p>
              </article>
            )) : (
              <p className="text-[14px] text-muted">No comments yet.</p>
            )}
          </div>

          <form className="mt-4" onSubmit={handleSubmit}>
            <label htmlFor="event-comment" className="text-[11px] font-bold uppercase text-body">
              Add a comment
            </label>
            <textarea
              id="event-comment"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Write a comment..."
              rows="3"
              maxLength={2000}
              required
              className="field mt-2 w-full px-4 py-3 rounded-lg bg-white border border-line text-[15px] text-ink leading-[1.6] placeholder:text-faint"
            />
            {error && <p className="mt-2 text-[13px] text-red-700" role="alert">{error}</p>}
            <button
              type="submit"
              disabled={isSubmitting || !commentText.trim()}
              className="mt-3 h-11 rounded-lg bg-nku px-5 font-bold text-[14px] text-ink disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? 'Posting...' : 'Comment'}
            </button>
          </form>
        </section>
      </section>
    </div>
  )
}
