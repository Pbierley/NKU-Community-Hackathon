import { useEffect, useState } from 'react';

import './Communication.css';
import Event from './Event';
import EventModal from './EventModal';

import defaultEvents from './events.json';

function Communication() {
  const [events, setEvents] = useState([]);

  const [isModalOpen, setIsModalOpen] = useState(false);


  /*
   * Load events.
   *
   * If this browser already has events saved,
   * use those. Otherwise use events.json.
   */
  useEffect(() => {
    const savedEvents =
      localStorage.getItem('nku-events');

    if (savedEvents) {
      setEvents(JSON.parse(savedEvents));
    } else {
      setEvents(defaultEvents);
    }
  }, []);


  /*
   * Save events whenever they change.
   */
  useEffect(() => {
    if (events.length > 0) {
      localStorage.setItem(
        'nku-events',
        JSON.stringify(events)
      );
    }
  }, [events]);


  /*
   * Add a newly created event to the feed.
   */
  function handlePost(newEvent) {
    setEvents((currentEvents) => [
      newEvent,
      ...currentEvents
    ]);

    setIsModalOpen(false);
  }


  /*
   * Attend / un-attend.
   */
  function handleAttend(eventId) {
    setEvents((currentEvents) =>
      currentEvents.map((event) => {

        if (event.id !== eventId) {
          return event;
        }

        const userId = 'current-user';

        const alreadyAttending =
          event.attendeeIds.includes(userId);

        return {
          ...event,

          attendeeIds: alreadyAttending
            ? event.attendeeIds.filter(
                (id) => id !== userId
              )
            : [
                ...event.attendeeIds,
                userId
              ]
        };
      })
    );
  }


  return (
    <div className="communication-page">

      {/* HEADER */}

      <header className="communication-header">

        <nav
          className="community-nav"
          aria-label="Community"
        >

          <span className="community-brand">
            NKU Community
          </span>

          <div className="community-nav-items">

            <span className="community-nav-item community-nav-item-active">
              Feed
            </span>

            <span className="community-nav-item">
              Events
            </span>

            <span className="community-nav-item">
              Groups
            </span>

          </div>

          <span
            className="community-nav-mark"
            aria-hidden="true"
          >
            NKU
          </span>

        </nav>


        <div className="community-search-wrap">

          <label
            className="visually-hidden"
            htmlFor="community-search"
          >
            Search the community
          </label>

          <input
            className="community-search"
            id="community-search"
            type="search"
            placeholder="Search the community"
          />

          <span
            className="community-search-icon"
            aria-hidden="true"
          />

        </div>

      </header>


      {/* FEED */}

      <main
        className="community-content"
        aria-label="Community feed"
      >

        {events.map((event) => (
          <Event
            key={event.id}
            event={event}
            onAttend={handleAttend}
          />
        ))}

      </main>


      {/* MAKE POST */}

      <div className="community-action-wrap">

        <button
          className="make-post-button"
          type="button"
          onClick={() => setIsModalOpen(true)}
        >
          Make Post
        </button>

      </div>


      {/* CREATE EVENT MODAL */}

      <EventModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onPost={handlePost}
      />


      <footer
        className="community-footer"
        aria-label="Footer"
      />

    </div>
  );
}

export default Communication;