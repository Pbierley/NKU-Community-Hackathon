# NKU Community Hub

A mobile-first campus app for Northern Kentucky University built during the 2026 Community Hackathon. The project combines campus navigation, parking and rec availability, schedule planning, event discovery, and admin tooling into a single React app backed by an Express API and MongoDB-ready data layer.

## Project overview

This repository contains the full app under the `hackathon/` folder. The frontend is a Vite + React application that runs in the browser, while the backend is an Express server in `hackathon/server/` that serves authenticated data and persists user/session information.

### Included features

- Campus map with search, user location, walking route guidance, and building pins
- Parking and Rec availability ratings by campus location
- Event calendar and event detail flows linked from campus map and shared URLs
- Student account management, schedule upload, and profile preferences
- Admin-only invite and role management
- Local JSON fallback when MongoDB credentials are not configured

## Tech stack

- Frontend: React 19 + Vite
- UI styling: Tailwind CSS
- Mapping: Leaflet + React Leaflet
- Backend: Express + MongoDB driver
- Auth and session handling: custom hashing/session logic in the API
- Data seeding: scripts under `hackathon/scripts/`
- Hosted on: Render
- Monitoring: BetterStack

## Repository layout

```text
.
├── .env.example                 # repo-level MongoDB and API env template
├── Buildings.json               # campus building data used by the app
├── design.md                    # design system references and UX notes
├── Project_Details.md           # project brief and original requirements
├── README.md                   # this overview document
├── hackathon/
│   ├── .env.example            # Vite/frontend env template
│   ├── package.json            # app scripts and dependencies
│   ├── vite.config.js          # Vite config, browser proxy, and host settings
│   ├── index.html              # app entry point
│   ├── public/                 # static assets
│   ├── scripts/                # seed/fetch data scripts
│   ├── server/                 # Express API and schedule parsing
│   └── src/                    # React app source and screens
└── README.md                   # root project README
```

## Local setup

1. Open a terminal in the repository root.
2. Create the environment files from the templates:

```bash
copy .env.example .env
copy hackathon\.env.example hackathon\.env
```

3. Update the values in `.env` and `hackathon/.env` as needed.

### Environment variables

Root `.env`:

```env
MongoURI=KEYTIME
MongoDB=hackathon
PORT=3001
CLIENT_ORIGIN=
DEVELOPER_EMAILS=
```

Notes:

- If `MongoURI` is left as `KEYTIME` or unset, the API automatically falls back to JSON files in `hackathon/server/data/`.
- `CLIENT_ORIGIN` is used for CORS configuration when hosting the API remotely.
- `DEVELOPER_EMAILS` can be used to grant developer privileges to selected NKU accounts.

Frontend `hackathon/.env`:

```env
MongoURI=KEYTIME
MongoDB=hackathon
PORT=3001
VITE_API_URL=
DEVELOPER_EMAILS=
```

Notes:

- In local development, leave `VITE_API_URL` blank so Vite can proxy `/api` to `http://localhost:3001`.
- For production hosting, set `VITE_API_URL` to the hosted API origin.

## Running the app

From the `hackathon/` directory:

```bash
npm install
npm run server
```

In a second terminal:

```bash
cd hackathon
npm run dev
```

The frontend is typically served at `http://localhost:5173` and the API listens on `http://localhost:3001`.

Optional phone testing:

```bash
npm run dev:phone
```

This enables a local HTTPS dev server for mobile/location testing.

## Available scripts

From `hackathon/package.json`:

```bash
npm run dev             # start the frontend dev server
npm run dev:phone       # start Vite with HTTPS for mobile testing
npm run build           # production build
npm run lint            # eslint validation
npm run preview         # preview the production build locally
npm run server          # start the Express API
npm run seed:buildings   # seed building catalog data
npm run seed:walkways    # seed walkway/route data
npm run seed:events     # seed event data
npm run fetch:events    # pull events from the engagement feed
npm run fetch:truist    # fetch Truist-related event data
npm run fetch:walkways  # fetch walkway data
```

## Backend behavior

The Express server in `hackathon/server/index.js`:

- serves campus data and auth endpoints
- manages user accounts and sessions
- supports admin invite flows and role permissions
- writes to MongoDB when configured
- falls back to JSON files under `hackathon/server/data/` when MongoDB is unavailable
- handles schedule parsing and PDF extraction utilities for uploaded class schedules

## Frontend app structure

```text
hackathon/src/
├── api.js
├── App.css
├── App.jsx
├── main.jsx
├── auth/                 # account types and auth hooks
├── Communication/        # event feed, calendar, event modals
├── components/           # shared UI pieces
├── Navigation/           # campus map, route, parking, parking ratings
├── screens/              # app screens: home, parking, account, events, login, admin
└── assets/
```

## Notes for contributors

- The app is already built as a mobile-first campus experience; keep UI changes aligned with the design notes in `design.md`.
- Local development works without a live MongoDB connection, but some features expect the API running on port 3001.
- The root repository is primarily a project wrapper; the actual implementation lives in `hackathon/`.

## Team

- Aaron Milner
- Sean Cancel
- Philip Bierly
- Zakaria Gouiss

## License

This project is for educational and hackathon use within the NKU Community Hackathon context.
