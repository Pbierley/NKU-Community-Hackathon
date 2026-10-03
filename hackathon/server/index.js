import express from 'express'
import { MongoClient } from 'mongodb'
import { randomBytes, scrypt as _scrypt, timingSafeEqual } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const scrypt = promisify(_scrypt)

// ─── MongoDB connection ─────────────────────────────────────────────
// Put your MongoDB connection string in the `MongoURI` variable in `.env`.
// The repo ships with the placeholder below — replace "KEYTIME" with the
// real key. See `.env.example` (repo root and hackathon/).
// When MongoURI is missing or still "KEYTIME", the API automatically falls
// back to local JSON files in `server/data/` so logins still work offline.
const MONGO_KEY_PLACEHOLDER = 'KEYTIME'
const rawUri = (process.env.MongoURI ?? '').trim()
const MONGO_URI = rawUri && rawUri !== MONGO_KEY_PLACEHOLDER ? rawUri : null

const port = Number(process.env.PORT ?? 3001)
const dbName = process.env.MongoDB ?? 'hackathon'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = join(__dirname, 'data')
const USERS_JSON = join(DATA_DIR, 'users.json')
const EVENTS_JSON = join(DATA_DIR, 'events.json')
const SESSIONS_JSON = join(DATA_DIR, 'sessions.json')
const SEED_EVENTS_JSON = join(__dirname, '..', 'src', 'Communication', 'events.json')
const SEED_BUILDINGS_JSON = join(__dirname, '..', '..', 'Buildings.json')

let db = null
let usersColl = null
let eventsColl = null
let sessionsColl = null

if (MONGO_URI) {
  try {
    const mongoClient = new MongoClient(MONGO_URI)
    await mongoClient.connect()
    db = mongoClient.db(dbName)
    usersColl = db.collection('users')
    eventsColl = db.collection('Events')
    sessionsColl = db.collection('sessions')
    await usersColl.createIndex({ email: 1 }, { unique: true })
    await sessionsColl.createIndex({ token: 1 }, { unique: true })
    console.log(`Connected to MongoDB (${dbName}).`)
  } catch (err) {
    console.error('MongoDB connect failed, falling back to JSON files:', err.message)
    db = null
    usersColl = null
    eventsColl = null
    sessionsColl = null
  }
} else {
  console.log('MongoURI is "KEYTIME" or unset — using local JSON files in server/data/.')
}

function mongoActive() {
  return Boolean(usersColl)
}

// ─── JSON-file helpers (fallback when MongoDB is unavailable) ───────
async function readJson(path, fallback) {
  try {
    return JSON.parse(await readFile(path, 'utf8'))
  } catch {
    return fallback
  }
}

async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, JSON.stringify(value, null, 2) + '\n', 'utf8')
}

async function ensureJsonStores() {
  await mkdir(DATA_DIR, { recursive: true })
  const users = await readJson(USERS_JSON, null)
  if (!Array.isArray(users)) await writeJson(USERS_JSON, [])
  const sessions = await readJson(SESSIONS_JSON, null)
  if (sessions === null || typeof sessions !== 'object') await writeJson(SESSIONS_JSON, {})
  const events = await readJson(EVENTS_JSON, null)
  if (!Array.isArray(events)) {
    const seed = await readJson(SEED_EVENTS_JSON, [])
    await writeJson(EVENTS_JSON, seed)
  }
}
await ensureJsonStores()

// ─── Password hashing (scrypt, no extra deps) ───────────────────────
async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')
  const derived = await scrypt(password, salt, 64)
  return `${salt}:${derived.toString('hex')}`
}

async function verifyPassword(password, stored) {
  const [salt, hash] = String(stored ?? '').split(':')
  if (!salt || !hash) return false
  const derived = await scrypt(password, salt, 64)
  const a = Buffer.from(hash, 'hex')
  const b = Buffer.from(derived.toString('hex'), 'hex')
  return a.length === b.length && timingSafeEqual(a, b)
}

// ─── User / session store (MongoDB primary, JSON fallback) ──────────
function publicUser(doc) {
  if (!doc) return null
  return {
    id: doc.id,
    name: doc.name,
    email: doc.email,
    year: doc.year ?? '',
    major: doc.major ?? '',
    interests: Array.isArray(doc.interests) ? doc.interests : [],
  }
}

async function findUserByEmail(email) {
  const key = email.toLowerCase()
  if (mongoActive()) return usersColl.findOne({ email: key })
  const users = await readJson(USERS_JSON, [])
  return users.find((u) => u.email === key) ?? null
}

async function findUserById(id) {
  if (mongoActive()) return usersColl.findOne({ id })
  const users = await readJson(USERS_JSON, [])
  return users.find((u) => u.id === id) ?? null
}

async function insertUser(doc) {
  if (mongoActive()) {
    await usersColl.insertOne({ ...doc })
    return doc
  }
  const users = await readJson(USERS_JSON, [])
  users.push(doc)
  await writeJson(USERS_JSON, users)
  return doc
}

async function createSession(userId) {
  const token = randomBytes(32).toString('hex')
  if (mongoActive()) {
    await sessionsColl.insertOne({ token, userId, createdAt: new Date() })
  } else {
    const sessions = await readJson(SESSIONS_JSON, {})
    sessions[token] = userId
    await writeJson(SESSIONS_JSON, sessions)
  }
  return token
}

async function userIdForToken(token) {
  if (!token) return null
  if (mongoActive()) {
    const s = await sessionsColl.findOne({ token })
    return s?.userId ?? null
  }
  const sessions = await readJson(SESSIONS_JSON, {})
  return sessions[token] ?? null
}

async function deleteSession(token) {
  if (!token) return
  if (mongoActive()) {
    await sessionsColl.deleteOne({ token })
    return
  }
  const sessions = await readJson(SESSIONS_JSON, {})
  delete sessions[token]
  await writeJson(SESSIONS_JSON, sessions)
}

function emailIsValid(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

// ─── Events store (MongoDB primary, JSON fallback) ──────────────────
async function listEvents() {
  if (mongoActive()) return eventsColl.find({}, { projection: { _id: 0 } }).sort({ id: 1 }).toArray()
  return readJson(EVENTS_JSON, [])
}

async function getEvent(id) {
  if (mongoActive()) return eventsColl.findOne({ id })
  const events = await readJson(EVENTS_JSON, [])
  return events.find((e) => e.id === id) ?? null
}

async function saveEvent(doc) {
  if (mongoActive()) {
    await eventsColl.insertOne({ ...doc })
    return doc
  }
  const events = await readJson(EVENTS_JSON, [])
  events.unshift(doc)
  await writeJson(EVENTS_JSON, events)
  return doc
}

async function setEventAttendees(id, attendeeIds) {
  if (mongoActive()) {
    await eventsColl.updateOne({ id }, { $set: { attendeeIds } })
    return
  }
  const events = await readJson(EVENTS_JSON, [])
  const idx = events.findIndex((e) => e.id === id)
  if (idx >= 0) {
    events[idx] = { ...events[idx], attendeeIds }
    await writeJson(EVENTS_JSON, events)
  }
}

async function listBuildings() {
  if (mongoActive()) {
    try {
      const coll = db.collection('buildings')
      const docs = await coll.find({}, { projection: { _id: 0 } }).sort({ id: 1 }).toArray()
      if (docs.length > 0) return docs
    } catch (err) {
      console.error(err)
    }
  }
  try {
    const raw = JSON.parse(await readFile(SEED_BUILDINGS_JSON, 'utf8'))
    return raw.buildings ?? raw ?? []
  } catch {
    return []
  }
}

// ─── App ────────────────────────────────────────────────────────────
const app = express()
app.use(express.json())

app.get('/api/health', (req, res) => {
  res.json({ ok: true, store: mongoActive() ? 'mongodb' : 'json' })
})

// ─── Auth: register ─────────────────────────────────────────────────
app.post('/api/auth/register', async (req, res) => {
  try {
    const name = String(req.body.name ?? '').trim()
    const email = String(req.body.email ?? '').trim().toLowerCase()
    const password = String(req.body.password ?? '')
    const year = String(req.body.year ?? '').trim()
    const major = String(req.body.major ?? '').trim()
    const interests = Array.isArray(req.body.interests)
      ? req.body.interests.map((i) => String(i).trim()).filter(Boolean)
      : []

    if (!name) return res.status(400).json({ error: 'Name is required.' })
    if (!emailIsValid(email)) return res.status(400).json({ error: 'Enter a valid email.' })
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' })
    }
    if (await findUserByEmail(email)) {
      return res.status(409).json({ error: 'An account with that email already exists.' })
    }

    const doc = {
      id: req.body.id || `user-${Date.now().toString(36)}-${randomBytes(4).toString('hex')}`,
      name,
      email,
      passwordHash: await hashPassword(password),
      year,
      major,
      interests,
      createdAt: new Date().toISOString(),
    }
    await insertUser(doc)
    const token = await createSession(doc.id)
    res.status(201).json({ token, user: publicUser(doc) })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Could not create account.' })
  }
})

// ─── Auth: login ────────────────────────────────────────────────────
app.post('/api/auth/login', async (req, res) => {
  try {
    const email = String(req.body.email ?? '').trim().toLowerCase()
    const password = String(req.body.password ?? '')
    if (!emailIsValid(email) || !password) {
      return res.status(400).json({ error: 'Enter your email and password.' })
    }
    const user = await findUserByEmail(email)
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return res.status(401).json({ error: 'Invalid email or password.' })
    }
    const token = await createSession(user.id)
    res.json({ token, user: publicUser(user) })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Could not log in.' })
  }
})

// ─── Auth: me / logout ──────────────────────────────────────────────
async function authUser(req) {
  const header = String(req.headers.authorization ?? '')
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  const userId = await userIdForToken(token)
  if (!userId) return null
  return findUserById(userId)
}

app.get('/api/auth/me', async (req, res) => {
  try {
    const user = await authUser(req)
    if (!user) return res.status(401).json({ error: 'Not signed in.' })
    res.json({ user: publicUser(user) })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Could not load account.' })
  }
})

app.post('/api/auth/logout', async (req, res) => {
  try {
    const header = String(req.headers.authorization ?? '')
    const token = header.startsWith('Bearer ') ? header.slice(7) : String(req.body?.token ?? '') || null
    await deleteSession(token)
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Could not sign out.' })
  }
})

// ─── Buildings / events (unchanged shape, MongoDB + JSON) ──────────
app.get('/api/buildings', async (req, res) => {
  try {
    res.json(await listBuildings())
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Could not load buildings.' })
  }
})

app.get('/api/events', async (req, res) => {
  try {
    res.json(await listEvents())
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Could not load events.' })
  }
})

app.post('/api/events', async (req, res) => {
  try {
    const title = String(req.body.title ?? '').trim()
    const location = String(req.body.location ?? '').trim()
    if (!title || !location) {
      res.status(400).json({ error: 'Title and location are required.' })
      return
    }
    const doc = {
      id: req.body.id || `event-${Date.now()}`,
      title,
      description: String(req.body.description ?? '').trim(),
      date: req.body.date || 'Upcoming',
      time: req.body.time || '',
      location,
      tags: Array.isArray(req.body.tags) ? req.body.tags : ['Campus'],
      images: Array.isArray(req.body.images) ? req.body.images : [],
      attendeeIds: [],
      reactions: { like: 0, love: 0, interested: 0 },
      comments: [],
    }
    const saved = await saveEvent(doc)
    // MongoDB injects `_id`; strip it so the API shape stays stable.
    // eslint-disable-next-line no-unused-vars
    const { _id, ...rest } = saved
    res.status(201).json(rest)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Could not create event.' })
  }
})

app.post('/api/events/:id/comments', async (req, res) => {
  try {
    const text = String(req.body.text ?? '').trim()
    if (!text) {
      res.status(400).json({ error: 'Comment text is required.' })
      return
    }

    const event = await events.findOne({ id: req.params.id })
    if (!event) {
      res.status(404).json({ error: 'Event not found.' })
      return
    }

    const comment = {
      id: `comment-${Date.now()}`,
      author: 'You',
      text,
    }
    await events.updateOne({ id: req.params.id }, { $push: { comments: comment } })
    res.status(201).json(comment)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Could not add comment.' })
  }
})

app.patch('/api/events/:id/register', async (req, res) => {
  try {
    // Prefer the signed-in user; fall back to the legacy demo id so old
    // clients keep working.
    const user = await authUser(req)
    const userId = user?.id ?? 'current-user'
    const event = await getEvent(req.params.id)
    if (!event) {
      res.status(404).json({ error: 'Event not found.' })
      return
    }
    const ids = event.attendeeIds ?? []
    const attendeeIds = ids.includes(userId) ? ids.filter((id) => id !== userId) : [...ids, userId]
    await setEventAttendees(event.id, attendeeIds)
    // eslint-disable-next-line no-unused-vars
    const { _id, ...rest } = event
    res.json({ ...rest, attendeeIds })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Could not update registration.' })
  }
})

app.listen(port, () => console.log(`API listening on http://localhost:${port}`))
