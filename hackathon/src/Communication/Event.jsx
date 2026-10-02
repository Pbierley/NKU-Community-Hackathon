function Event({ event, onAttend }) {
  const attendeeCount = event.attendeeIds.length;

  return (
    <article className="event-card">

      <div className="event-card-header">
        <div className="event-card-heading">
          <h2 className="event-title">
            {event.title}
          </h2>

          <p className="event-location">
            {event.location}
          </p>
        </div>

        <span className="event-badge">
          Event
        </span>
      </div>

      <div className="event-card-body">

        {event.description && (
          <p className="event-description">
            {event.description}
          </p>
        )}

        <div className="event-meta">
          <span>
            {attendeeCount} attending
          </span>

          <span>
            {event.comments.length} comments
          </span>
        </div>

        <button
          className="event-attend-button"
          type="button"
          onClick={() => onAttend(event.id)}
        >
          Attend
        </button>
      </div>

      {event.comments.length > 0 && (
        <div className="event-comments">
          {event.comments.map((comment) => (
            <div
              className="event-comment"
              key={comment.id}
            >
              <strong>
                {comment.author}
              </strong>

              <span>
                {comment.text}
              </span>
            </div>
          ))}
        </div>
      )}

    </article>
  );
}

export default Event;