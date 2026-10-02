# NKU Community Hackathon

Community app for Northern Kentucky University (NKU). Two features are built separately, then combined: campus navigation and campus events.

## Stack

- Frontend: React with Vite.
- Data: local JSON files in the repo. No server, database, or auth.
- "Backend" in early notes means this local JSON store, not an API.

## How to work

Build the two features on separate branches, then merge them near the end.

| Branch | Feature |
| --- | --- |
| `navigation` | Campus map and wayfinding |
| `communication` | Campus events |

Keep each feature's work on its own branch until the merge. After the merge, events from Communication appear as pins on the Navigation map.

## Navigation

Users can:

- See their current location on the NKU campus map.
- See the direction they are facing.
- See a pin for the building they are going to.

Reference image: `CamScanner 10-2-26 15.53-1.jpg` (NKU Campus Accessibility Map).

## Communication

Students post events happening on campus. Each event includes what it is and where it is.

Users can:

- Create an event.
- Comment on an event.
- Mark that they will attend.
- See how many people are attending.

## After merge

- Show Communication events as marked locations on the Navigation map.
- A user can open an event pin and see the event details from Communication.

## Data shape

Store records in local JSON. Use stable string ids.

Event:

- `id`
- `title` — what the event is
- `location` — where it is on campus (building or place name)
- `attendeeIds` — users who marked attend; the count is `attendeeIds.length`
- `comments` — list of `{ id, author, text }`

Do not add accounts, a database, or a network API unless this file is updated.
