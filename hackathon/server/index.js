import express from 'express'
import { MongoClient } from 'mongodb'
import { randomBytes, scrypt as _scrypt, timingSafeEqual } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { accountTypeOf, campusRoleOf, canCreateEvents, canGrantElevatedRoles, canInviteAdmins, canManageLocations, canModerateEvents, canRemoveAdmins, isDeveloper, isNkuEmail } from '../src/auth/accountTypes.js'
import { isParkingPlace, isRecreationCenter } from '../src/Navigation/parkingPlaces.js'
import { parseSchedule } from './parseSchedule.js'

// extractPdfText is imported lazily inside the schedule-upload route so a
// missing or broken pdfjs install returns a 503 for PDF uploads instead of
// crashing the whole API at boot.

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
const ADMIN_INVITES_JSON = join(DATA_DIR, 'admin-invites.json')
const SEED_EVENTS_JSON = join(__dirname, '..', 'src', 'Communication', 'events.json')
const SEED_BUILDINGS_JSON = join(__dirname, '..', '..', 'Buildings.json')
const BRANDING_JSON = join(DATA_DIR, 'branding.json')

let db = null
let usersColl = null
let eventsColl = null
let sessionsColl = null
let adminInvitesColl = null
let parkingRankings = null

if (MONGO_URI) {
  try {
    const mongoClient = new MongoClient(MONGO_URI)
    await mongoClient.connect()
    db = mongoClient.db(dbName)
    usersColl = db.collection('users')
    eventsColl = db.collection('Events')
    sessionsColl = db.collection('sessions')
    adminInvitesColl = db.collection('adminInvites')
    await usersColl.createIndex({ email: 1 }, { unique: true })
    await sessionsColl.createIndex({ token: 1 }, { unique: true })
    await adminInvitesColl.createIndex({ email: 1 }, { unique: true })
    parkingRankings = db.collection('rankings')
    await parkingRankings.createIndex({ placeId: 1, userId: 1, date: 1 }, { unique: true })
    await parkingRankings.createIndex({ date: 1 })
    console.log(`Connected to MongoDB (${dbName}).`)
  } catch (err) {
    console.error('MongoDB connect failed, falling back to JSON files:', err.message)
    db = null
    usersColl = null
    eventsColl = null
    sessionsColl = null
    adminInvitesColl = null
    parkingRankings = null
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
  const invites = await readJson(ADMIN_INVITES_JSON, null)
  if (!Array.isArray(invites)) await writeJson(ADMIN_INVITES_JSON, [])
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
function publicSemesters(value) {
  if (!Array.isArray(value)) return []
  return value.slice(0, 12).map((semester) => ({
    name: String(semester?.name ?? 'Schedule'),
    updatedAt: semester?.updatedAt ?? '',
    classes: (Array.isArray(semester?.classes) ? semester.classes : []).slice(0, 40).map((item) => ({
      code: String(item?.code ?? ''),
      title: String(item?.title ?? ''),
      days: String(item?.days ?? ''),
      time: String(item?.time ?? ''),
      location: String(item?.location ?? ''),
      buildingId: Number.isFinite(item?.buildingId) ? item.buildingId : null,
      buildingName: String(item?.buildingName ?? ''),
    })),
  }))
}

function publicUser(doc) {
  if (!doc) return null
  return {
    id: doc.id,
    name: doc.name,
    email: doc.email,
    year: doc.year ?? '',
    major: doc.major ?? '',
    interests: Array.isArray(doc.interests) ? doc.interests : [],
    accountType: accountTypeOf(doc),
    campusRole: isNkuEmail(doc.email) ? campusRoleOf(doc.campusRole) : '',
    semesters: publicSemesters(doc.semesters),
  }
}

function developerEmails() {
  return String(process.env.DEVELOPER_EMAILS ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
}

function resolvedAccountType(user) {
  if (developerEmails().includes(String(user?.email ?? '').toLowerCase())) return 'developer'
  return accountTypeOf(user)
}

async function ensureAccountType(user) {
  if (!user) return null
  const accountType = resolvedAccountType(user)
  if (user.accountType === accountType) return user
  const updated = await updateUser(user.id, { accountType })
  return updated ?? { ...user, accountType }
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

async function updateUser(id, patch) {
  if (mongoActive()) {
    const result = await usersColl.findOneAndUpdate(
      { id },
      { $set: patch },
      { returnDocument: 'after' },
    )
    return result ?? null
  }
  const users = await readJson(USERS_JSON, [])
  const idx = users.findIndex((u) => u.id === id)
  if (idx === -1) return null
  users[idx] = { ...users[idx], ...patch }
  await writeJson(USERS_JSON, users)
  return users[idx]
}

async function findAdminInvite(email) {
  const key = email.toLowerCase()
  if (mongoActive()) return adminInvitesColl.findOne({ email: key })
  const invites = await readJson(ADMIN_INVITES_JSON, [])
  return invites.find((invite) => invite.email === key) ?? null
}

async function saveAdminInvite(email, invitedBy, accountType) {
  const doc = {
    email: email.toLowerCase(),
    invitedBy,
    accountType: accountType === 'developer' || accountType === 'superadmin' ? accountType : 'admin',
    createdAt: new Date().toISOString(),
  }
  if (mongoActive()) {
    await adminInvitesColl.updateOne({ email: doc.email }, { $set: doc }, { upsert: true })
    return doc
  }
  const invites = await readJson(ADMIN_INVITES_JSON, [])
  const idx = invites.findIndex((invite) => invite.email === doc.email)
  if (idx === -1) invites.push(doc)
  else invites[idx] = doc
  await writeJson(ADMIN_INVITES_JSON, invites)
  return doc
}

async function deleteAdminInvite(email) {
  const key = email.toLowerCase()
  if (mongoActive()) {
    await adminInvitesColl.deleteOne({ email: key })
    return
  }
  const invites = await readJson(ADMIN_INVITES_JSON, [])
  await writeJson(ADMIN_INVITES_JSON, invites.filter((invite) => invite.email !== key))
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

function eventCreatorId(event) {
  return event?.creatorId ?? event?.createdBy ?? event?.authorId ?? event?.userId ?? null
}

function isEventOwner(event, user) {
  const creatorId = eventCreatorId(event)
  return Boolean(user?.id && creatorId && creatorId === user.id)
}

function canEditEvent(event, user) {
  if (!user) return false
  if (isDeveloper(user)) return true
  return isEventOwner(event, user)
}

function canDeleteEvent(event, user) {
  if (!user) return false
  if (canModerateEvents(user)) return true
  return isEventOwner(event, user)
}

async function updateEventDoc(id, update) {
  if (mongoActive()) {
    await eventsColl.updateOne({ id }, {
      $set: update,
      $unset: { when: '', category: '' },
    })
    return eventsColl.findOne({ id }, { projection: { _id: 0 } })
  }
  const events = await readJson(EVENTS_JSON, [])
  const idx = events.findIndex((e) => e.id === id)
  if (idx === -1) return null
  // Drop legacy display-only fields; the editable shape uses date/time/tags.
  // eslint-disable-next-line no-unused-vars
  const { when: _when, category: _category, ...rest } = events[idx]
  events[idx] = { ...rest, ...update }
  await writeJson(EVENTS_JSON, events)
  return events[idx]
}

async function deleteEventDoc(id) {
  if (mongoActive()) {
    const result = await eventsColl.deleteOne({ id })
    return result.deletedCount > 0
  }
  const events = await readJson(EVENTS_JSON, [])
  const idx = events.findIndex((e) => e.id === id)
  if (idx === -1) return false
  events.splice(idx, 1)
  await writeJson(EVENTS_JSON, events)
  return true
}

async function appendEventComment(id, comment) {
  if (mongoActive()) {
    const result = await eventsColl.updateOne({ id }, { $push: { comments: comment } })
    return result.matchedCount > 0
  }

  const events = await readJson(EVENTS_JSON, [])
  const eventIndex = events.findIndex((event) => event.id === id)
  if (eventIndex === -1) return false

  const event = events[eventIndex]
  events[eventIndex] = {
    ...event,
    comments: [...(event.comments ?? []), comment],
  }
  await writeJson(EVENTS_JSON, events)
  return true
}

async function readSeedBuildings() {
  try {
    const raw = JSON.parse(await readFile(SEED_BUILDINGS_JSON, 'utf8'))
    return raw.buildings ?? raw ?? []
  } catch {
    return []
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
  return readSeedBuildings()
}

function buildingNameKey(name) {
  return String(name ?? '').trim().toLowerCase()
}

// Copies the seed file into Mongo the first time a location is added,
// so the new row does not replace the existing campus list.
async function addBuilding(building) {
  if (!mongoActive()) {
    const error = new Error('Locations are stored in MongoDB, and the database is not connected.')
    error.status = 503
    throw error
  }
  const coll = db.collection('buildings')
  await coll.createIndex({ id: 1 }, { unique: true })
  let existing = await coll.find({}, { projection: { _id: 0 } }).toArray()
  if (existing.length === 0) {
    const seed = await readSeedBuildings()
    if (seed.length > 0) {
      await coll.insertMany(seed.map((doc) => ({ ...doc })))
      existing = seed
    }
  }
  if (existing.some((doc) => buildingNameKey(doc.name) === buildingNameKey(building.name))) {
    const error = new Error('A location with that name already exists.')
    error.status = 409
    throw error
  }
  const nextId = existing.reduce((max, doc) => Math.max(max, Number(doc.id) || 0), 0) + 1
  const saved = {
    id: nextId,
    name: building.name,
    Alias: building.Alias,
    Location: building.Location,
    parking: building.parking,
  }
  await coll.insertOne({ ...saved })
  return saved
}

function withoutMongoError() {
  const error = new Error('Locations are stored in MongoDB, and the database is not connected.')
  error.status = 503
  return error
}

function buildingsColl() {
  if (!mongoActive()) throw withoutMongoError()
  const coll = db.collection('buildings')
  return coll
}

async function updateBuilding(id, patch) {
  const coll = buildingsColl()
  const existing = await coll.findOne({ id }, { projection: { _id: 0 } })
  if (!existing) {
    const error = new Error('That location was not found.')
    error.status = 404
    throw error
  }
  if (patch.name && existing && buildingNameKey(patch.name) !== buildingNameKey(existing.name)) {
    const clash = await coll.findOne({ name: patch.name })
    if (clash) {
      const error = new Error('A location with that name already exists.')
      error.status = 409
      throw error
    }
  }
  const next = {
    ...existing,
    ...(patch.name !== undefined ? { name: patch.name } : {}),
    ...(patch.Alias !== undefined ? { Alias: patch.Alias } : {}),
    ...(patch.Location !== undefined ? { Location: patch.Location } : {}),
    ...(patch.parking !== undefined ? { parking: patch.parking } : {}),
  }
  await coll.updateOne(
    { id },
    { $set: { name: next.name, Alias: next.Alias, Location: next.Location, parking: next.parking } },
  )
  return next
}

async function deleteBuilding(id) {
  const coll = buildingsColl()
  const result = await coll.deleteOne({ id })
  if (result.deletedCount === 0) {
    const error = new Error('That location was not found.')
    error.status = 404
    throw error
  }
  return { ok: true, id }
}

// ─── Branding (white-label customization, developer-only writes) ────
// A single document shared by every client. Stored in Mongo when connected,
// otherwise in server/data/branding.json. New collection + new file only —
// existing users/events/buildings data is never migrated or rewritten.
const DEFAULT_BRANDING = {
  schoolName: 'Northern Kentucky University',
  portalTagline: 'Campus Experience Portal',
  colors: {
    nku: '#FFC72C',
    nkuDeep: '#EAB308',
    ink: '#111827',
    body: '#374151',
    muted: '#6B7280',
    faint: '#9CA3AF',
    line: '#e5e7eb',
    canvas: '#F9FAFB',
    wash: '#F3F4F6',
  },
  logoUrl: '',
  map: {
    center: [39.0325, -84.4615],
    bounds: [
      [39.0245, -84.4725],
      [39.0425, -84.45],
    ],
  },
}

const BRANDING_COLOR_KEYS = Object.keys(DEFAULT_BRANDING.colors)
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/

function isValidLat(lat) {
  return Number.isFinite(lat) && lat >= -90 && lat <= 90
}

function isValidLng(lng) {
  return Number.isFinite(lng) && lng >= -180 && lng <= 180
}

function sanitizeBranding(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    const error = new Error('Branding must be an object.')
    error.status = 400
    throw error
  }
  const out = {}
  if (input.schoolName !== undefined) {
    const schoolName = String(input.schoolName).trim()
    if (!schoolName || schoolName.length > 120) {
      const error = new Error('Enter a school name (120 characters or fewer).')
      error.status = 400
      throw error
    }
    out.schoolName = schoolName
  }
  if (input.portalTagline !== undefined) {
    const portalTagline = String(input.portalTagline).trim()
    if (portalTagline.length > 160) {
      const error = new Error('Keep the tagline to 160 characters or fewer.')
      error.status = 400
      throw error
    }
    out.portalTagline = portalTagline
  }
  if (input.colors !== undefined) {
    if (!input.colors || typeof input.colors !== 'object' || Array.isArray(input.colors)) {
      const error = new Error('Colors must be an object.')
      error.status = 400
      throw error
    }
    const colors = {}
    for (const [key, value] of Object.entries(input.colors)) {
      if (!BRANDING_COLOR_KEYS.includes(key)) {
        const error = new Error(`Unknown color "${key}".`)
        error.status = 400
        throw error
      }
      if (!HEX_COLOR.test(String(value))) {
        const error = new Error(`Color "${key}" must be a hex value like #FFC72C.`)
        error.status = 400
        throw error
      }
      colors[key] = String(value).toUpperCase()
    }
    out.colors = colors
  }
  if (input.logoUrl !== undefined) {
    const logoUrl = String(input.logoUrl).trim()
    if (logoUrl.length > 3_500_000) {
      const error = new Error('That logo is too large. Use an image under 2 MB.')
      error.status = 400
      throw error
    }
    const ok =
      logoUrl === '' ||
      logoUrl.startsWith('/') ||
      logoUrl.startsWith('http://') ||
      logoUrl.startsWith('https://') ||
      /^data:image\/(png|jpeg|webp|gif|svg\+xml|avif);base64,/.test(logoUrl)
    if (!ok) {
      const error = new Error('Logo must be an uploaded image, an https URL, or a site path.')
      error.status = 400
      throw error
    }
    out.logoUrl = logoUrl
  }
  if (input.map !== undefined) {
    if (!input.map || typeof input.map !== 'object' || Array.isArray(input.map)) {
      const error = new Error('Map must be an object.')
      error.status = 400
      throw error
    }
    const map = {}
    if (input.map.center !== undefined) {
      const [lat, lng] = [Number(input.map.center?.[0]), Number(input.map.center?.[1])]
      if (!isValidLat(lat) || !isValidLng(lng)) {
        const error = new Error('Enter a valid map center latitude and longitude.')
        error.status = 400
        throw error
      }
      map.center = [lat, lng]
    }
    if (input.map.bounds !== undefined) {
      const [[s, w], [n, e]] = [
        [Number(input.map.bounds?.[0]?.[0]), Number(input.map.bounds?.[0]?.[1])],
        [Number(input.map.bounds?.[1]?.[0]), Number(input.map.bounds?.[1]?.[1])],
      ]
      if (!isValidLat(s) || !isValidLng(w) || !isValidLat(n) || !isValidLng(e) || !(s < n) || !(w < e)) {
        const error = new Error('Enter valid map bounds with south < north and west < east.')
        error.status = 400
        throw error
      }
      map.bounds = [
        [s, w],
        [n, e],
      ]
    }
    out.map = map
  }
  return out
}

async function readBranding() {
  let stored = null
  if (mongoActive()) {
    try {
      stored = await db.collection('branding').findOne({ _id: 'current' })
    } catch (err) {
      console.error(err)
    }
  }
  if (!stored) stored = await readJson(BRANDING_JSON, null)
  if (!stored || typeof stored !== 'object') return structuredClone(DEFAULT_BRANDING)
  return {
    schoolName: typeof stored.schoolName === 'string' && stored.schoolName ? stored.schoolName : DEFAULT_BRANDING.schoolName,
    portalTagline: typeof stored.portalTagline === 'string' ? stored.portalTagline : DEFAULT_BRANDING.portalTagline,
    colors: { ...DEFAULT_BRANDING.colors, ...stored.colors },
    logoUrl: typeof stored.logoUrl === 'string' ? stored.logoUrl : '',
    map: {
      center: Array.isArray(stored.map?.center) ? stored.map.center : [...DEFAULT_BRANDING.map.center],
      bounds: Array.isArray(stored.map?.bounds) ? stored.map.bounds : DEFAULT_BRANDING.map.bounds.map((c) => [...c]),
    },
  }
}

async function writeBranding(patch) {
  const current = await readBranding()
  const next = {
    ...current,
    ...patch,
    colors: { ...current.colors, ...(patch.colors ?? {}) },
    map: { ...current.map, ...(patch.map ?? {}) },
    updatedAt: new Date().toISOString(),
  }
  if (mongoActive()) {
    try {
      await db.collection('branding').updateOne({ _id: 'current' }, { $set: next }, { upsert: true })
    } catch (err) {
      console.error(err)
    }
  }
  await writeJson(BRANDING_JSON, next)
  return next
}

// ─── App ────────────────────────────────────────────────────────────
const app = express()
app.use(express.json({ limit: '12mb' }))

// Comma-separated site origins allowed to call this API from a browser.
// Local dev uses the Vite proxy, so this stays empty until the hosted site exists.
function allowedOrigins() {
  return (process.env.CLIENT_ORIGIN ?? '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean)
}

app.use((req, res, next) => {
  const requestOrigin = req.get('origin')
  if (requestOrigin && allowedOrigins().includes(requestOrigin)) {
    res.setHeader('Access-Control-Allow-Origin', requestOrigin)
    res.setHeader('Vary', 'Origin')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS')
  }
  if (req.method === 'OPTIONS') {
    res.sendStatus(204)
    return
  }
  next()
})

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

    const nku = isNkuEmail(email)
    const campusRole = nku ? campusRoleOf(req.body.campusRole) : ''
    if (nku && !campusRole) {
      return res.status(400).json({ error: 'Choose student or staff.' })
    }

    // Signup never accepts an account type. Developer emails come from
    // server config. Everyone else is basic unless an invite is waiting.
    const invited = await findAdminInvite(email)
    const invitedType = invited?.accountType === 'developer' || invited?.accountType === 'superadmin'
      ? invited.accountType
      : invited
        ? 'admin'
        : 'basic'
    const doc = {
      id: req.body.id || `user-${Date.now().toString(36)}-${randomBytes(4).toString('hex')}`,
      name,
      email,
      passwordHash: await hashPassword(password),
      year,
      major,
      interests,
      campusRole,
      createdAt: new Date().toISOString(),
      accountType: developerEmails().includes(email) ? 'developer' : invitedType,
    }
    await insertUser(doc)
    if (invited) await deleteAdminInvite(email)
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
    let user = await ensureAccountType(await findUserByEmail(email))
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return res.status(401).json({ error: 'Invalid email or password.' })
    }
    const campusRole = isNkuEmail(email) ? campusRoleOf(req.body.campusRole) : ''
    if (campusRole && user.campusRole !== campusRole) {
      user = (await updateUser(user.id, { campusRole })) ?? { ...user, campusRole }
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
  const user = await findUserById(userId)
  return ensureAccountType(user)
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

// ─── Auth: update profile (name, year, major, interests) ─────────────
app.patch('/api/auth/me', async (req, res) => {
  try {
    const user = await authUser(req)
    if (!user) return res.status(401).json({ error: 'Not signed in.' })

    const name = String(req.body.name ?? '').trim()
    if (!name) return res.status(400).json({ error: 'Name is required.' })

    const patch = {
      name,
      year: String(req.body.year ?? '').trim(),
      major: String(req.body.major ?? '').trim(),
      interests: Array.isArray(req.body.interests)
        ? req.body.interests.map((i) => String(i).trim()).filter(Boolean).slice(0, 50)
        : [],
    }
    if (isNkuEmail(user.email)) {
      const campusRole = campusRoleOf(req.body.campusRole)
      if (!campusRole) return res.status(400).json({ error: 'Choose student or staff.' })
      patch.campusRole = campusRole
    }
    const updated = await updateUser(user.id, patch)
    if (!updated) return res.status(404).json({ error: 'Account not found.' })
    res.json({ user: publicUser(updated) })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Could not save account.' })
  }
})

app.post('/api/auth/schedule', async (req, res) => {
  try {
    const user = await authUser(req)
    if (!user) return res.status(401).json({ error: 'Sign in to upload a schedule.' })

    const filename = String(req.body.filename ?? '')
    let text = String(req.body.text ?? '')
    if (req.body.pdf) {
      const buffer = Buffer.from(String(req.body.pdf), 'base64')
      if (buffer.length < 5 || buffer.length > 8_000_000) {
        return res.status(400).json({ error: 'That PDF could not be read.' })
      }
      let extractPdfText
      try {
        ;({ extractPdfText } = await import('./extractPdfText.js'))
      } catch (err) {
        console.error(err)
        return res.status(503).json({ error: 'PDF uploads are unavailable right now.' })
      }
      try {
        text = await extractPdfText(buffer)
      } catch (err) {
        console.error(err)
        return res.status(400).json({ error: 'That PDF could not be read.' })
      }
    }
    if (!text.trim()) return res.status(400).json({ error: 'Choose a schedule file.' })
    if (text.length > 400_000) return res.status(400).json({ error: 'That file is too large.' })

    let parsed
    try {
      parsed = parseSchedule(text, await listBuildings(), filename)
    } catch (err) {
      return res.status(err.status || 400).json({ error: err.message || 'Could not read that schedule.' })
    }
    if (parsed.length === 0 || parsed.every((semester) => semester.classes.length === 0)) {
      return res.status(400).json({
        error: 'No classes were found. Include a course, such as CSC 402, and a location, such as Griffin Hall 250.',
      })
    }

    const now = new Date().toISOString()
    const incoming = parsed.map((semester) => ({ ...semester, updatedAt: now }))
    const kept = publicSemesters(user.semesters).filter(
      (semester) => !incoming.some((next) => next.name.toLowerCase() === semester.name.toLowerCase()),
    )
    const updated = await updateUser(user.id, { semesters: [...incoming, ...kept].slice(0, 12) })
    if (!updated) return res.status(404).json({ error: 'Account not found.' })
    res.json({ user: publicUser(updated) })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Could not save that schedule.' })
  }
})

app.post('/api/auth/admin-invites', async (req, res) => {
  try {
    const actor = await authUser(req)
    if (!actor) {
      res.status(401).json({ error: 'Sign in to invite an admin.' })
      return
    }
    if (!canInviteAdmins(actor)) {
      res.status(403).json({ error: 'Only an admin or developer can invite an admin.' })
      return
    }
    const email = String(req.body.email ?? '').trim().toLowerCase()
    const role = String(req.body.accountType ?? 'admin').trim().toLowerCase()
    if (!emailIsValid(email)) {
      res.status(400).json({ error: 'Enter the email to invite.' })
      return
    }
    if (role !== 'admin' && role !== 'developer' && role !== 'superadmin') {
      res.status(400).json({ error: 'Choose admin, superadmin, or developer.' })
      return
    }
    if ((role === 'developer' || role === 'superadmin') && !canGrantElevatedRoles(actor)) {
      res.status(403).json({ error: 'Only a developer can invite a developer or superadmin.' })
      return
    }
    if (developerEmails().includes(email) && role !== 'developer') {
      res.status(400).json({ error: 'That email is already a developer.' })
      return
    }
    const target = await findUserByEmail(email)
    if (target) {
      const type = resolvedAccountType(target)
      if (type === role) {
        res.json({ status: 'already', user: publicUser(target) })
        return
      }
      if (!canGrantElevatedRoles(actor) && type !== 'basic') {
        res.status(400).json({ error: 'That account already has a higher role.' })
        return
      }
      const updated = await updateUser(target.id, { accountType: role })
      if (!updated) {
        res.status(404).json({ error: 'No account with that email.' })
        return
      }
      res.json({ status: 'granted', user: publicUser(updated) })
      return
    }
    const pending = await findAdminInvite(email)
    const pendingElevated = pending?.accountType === 'developer' || pending?.accountType === 'superadmin'
    if (pendingElevated && !canGrantElevatedRoles(actor)) {
      res.status(400).json({ error: 'That email is already invited with a higher role.' })
      return
    }
    await saveAdminInvite(email, actor.id, role)
    res.status(201).json({ status: 'invited', email, accountType: role })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Could not invite that admin.' })
  }
})

app.post('/api/auth/role-removals', async (req, res) => {
  try {
    const actor = await authUser(req)
    if (!actor) {
      res.status(401).json({ error: 'Sign in to remove a role.' })
      return
    }
    if (!canRemoveAdmins(actor)) {
      res.status(403).json({ error: 'Only a superadmin or developer can remove a role.' })
      return
    }
    const email = String(req.body.email ?? '').trim().toLowerCase()
    if (!emailIsValid(email)) {
      res.status(400).json({ error: 'Enter the email to remove.' })
      return
    }
    if (email === String(actor.email ?? '').toLowerCase()) {
      res.status(400).json({ error: 'You cannot remove your own role.' })
      return
    }
    if (developerEmails().includes(email)) {
      res.status(400).json({ error: 'That email stays a developer from the server configuration.' })
      return
    }
    const target = await findUserByEmail(email)
    if (target) {
      const type = resolvedAccountType(target)
      const developerCanRemove = isDeveloper(actor) && (type === 'admin' || type === 'superadmin' || type === 'developer')
      const superadminCanRemove = accountTypeOf(actor) === 'superadmin' && type === 'admin'
      if (!developerCanRemove && !superadminCanRemove) {
        res.status(403).json({
          error: type === 'basic'
            ? 'That account is not an admin, superadmin, or developer.'
            : 'You cannot remove that role.',
        })
        return
      }
      const updated = await updateUser(target.id, { accountType: 'basic' })
      await deleteAdminInvite(email)
      if (!updated) {
        res.status(404).json({ error: 'No account with that email.' })
        return
      }
      res.json({ status: 'removed', user: publicUser(updated) })
      return
    }
    const pending = await findAdminInvite(email)
    if (!pending) {
      res.status(404).json({ error: 'No account with that email.' })
      return
    }
    const pendingType = pending.accountType === 'developer' || pending.accountType === 'superadmin' ? pending.accountType : 'admin'
    const developerCanRemove = isDeveloper(actor)
    const superadminCanRemove = accountTypeOf(actor) === 'superadmin' && pendingType === 'admin'
    if (!developerCanRemove && !superadminCanRemove) {
      res.status(403).json({ error: 'You cannot remove that role.' })
      return
    }
    await deleteAdminInvite(email)
    res.json({ status: 'removed', email })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Could not remove that role.' })
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

app.post('/api/buildings', async (req, res) => {
  try {
    const actor = await authUser(req)
    if (!actor) {
      res.status(401).json({ error: 'Sign in to add a location.' })
      return
    }
    if (!canManageLocations(actor)) {
      res.status(403).json({ error: 'Only an admin or developer can add a location.' })
      return
    }

    const name = String(req.body.name ?? '').trim()
    if (!name || name.length > 120) {
      res.status(400).json({ error: 'Enter a full name (120 characters or fewer).' })
      return
    }

    const aliasRaw = req.body.alias ?? req.body.Alias ?? ''
    const aliases = (Array.isArray(aliasRaw) ? aliasRaw : String(aliasRaw).split(','))
      .map((alias) => String(alias).trim())
      .filter(Boolean)
    if (aliases.length > 20 || aliases.some((alias) => alias.length > 80)) {
      res.status(400).json({ error: 'Use up to 20 aliases, each 80 characters or fewer.' })
      return
    }

    const lat = Number(req.body.lat)
    const lng = Number(req.body.lng)
    if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) {
      res.status(400).json({ error: 'Enter latitude and longitude as numbers.' })
      return
    }

    const saved = await addBuilding({
      name,
      Alias: [...new Set(aliases)],
      Location: { lat, lng },
      parking: req.body.parking === true,
    })
    res.status(201).json(saved)
  } catch (err) {
    console.error(err)
    const status = Number(err.status) || 500
    res.status(status).json({
      error: status === 500 ? 'Could not add the location.' : err.message,
    })
  }
})

app.patch('/api/buildings/:id', async (req, res) => {
  try {
    const actor = await authUser(req)
    if (!actor) {
      res.status(401).json({ error: 'Sign in to edit a location.' })
      return
    }
    if (!canManageLocations(actor)) {
      res.status(403).json({ error: 'Only an admin or developer can edit a location.' })
      return
    }
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) {
      res.status(400).json({ error: 'That location was not found.' })
      return
    }
    const patch = {}
    if (req.body.name !== undefined) {
      const name = String(req.body.name).trim()
      if (!name || name.length > 120) {
        res.status(400).json({ error: 'Enter a full name (120 characters or fewer).' })
        return
      }
      patch.name = name
    }
    if (req.body.alias !== undefined || req.body.Alias !== undefined) {
      const aliasRaw = req.body.alias ?? req.body.Alias ?? ''
      const aliases = (Array.isArray(aliasRaw) ? aliasRaw : String(aliasRaw).split(','))
        .map((alias) => String(alias).trim())
        .filter(Boolean)
      if (aliases.length > 20 || aliases.some((alias) => alias.length > 80)) {
        res.status(400).json({ error: 'Use up to 20 aliases, each 80 characters or fewer.' })
        return
      }
      patch.Alias = [...new Set(aliases)]
    }
    if (req.body.lat !== undefined || req.body.lng !== undefined) {
      const lat = Number(req.body.lat)
      const lng = Number(req.body.lng)
      if (!isValidLat(lat) || !isValidLng(lng)) {
        res.status(400).json({ error: 'Enter latitude and longitude as numbers.' })
        return
      }
      patch.Location = { lat, lng }
    }
    if (req.body.parking !== undefined) {
      patch.parking = req.body.parking === true
    }
    if (Object.keys(patch).length === 0) {
      res.status(400).json({ error: 'Nothing to update.' })
      return
    }
    res.json(await updateBuilding(id, patch))
  } catch (err) {
    console.error(err)
    const status = Number(err.status) || 500
    res.status(status).json({
      error: status === 500 ? 'Could not update the location.' : err.message,
    })
  }
})

app.delete('/api/buildings/:id', async (req, res) => {
  try {
    const actor = await authUser(req)
    if (!actor) {
      res.status(401).json({ error: 'Sign in to remove a location.' })
      return
    }
    if (!canManageLocations(actor)) {
      res.status(403).json({ error: 'Only an admin or developer can remove a location.' })
      return
    }
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) {
      res.status(400).json({ error: 'That location was not found.' })
      return
    }
    res.json(await deleteBuilding(id))
  } catch (err) {
    console.error(err)
    const status = Number(err.status) || 500
    res.status(status).json({
      error: status === 500 ? 'Could not remove the location.' : err.message,
    })
  }
})

// ─── Branding (white-label customization) ───────────────────────
app.get('/api/branding', async (req, res) => {
  try {
    res.json(await readBranding())
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Could not load branding.' })
  }
})

app.put('/api/branding', async (req, res) => {
  try {
    const actor = await authUser(req)
    if (!actor) {
      res.status(401).json({ error: 'Sign in to change branding.' })
      return
    }
    if (!isDeveloper(actor)) {
      res.status(403).json({ error: 'Only a developer can change branding.' })
      return
    }
    let patch
    try {
      patch = sanitizeBranding(req.body)
    } catch (err) {
      res.status(Number(err.status) || 400).json({ error: err.message })
      return
    }
    res.json(await writeBranding(patch))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Could not save branding.' })
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
    // Attribute the event to its creator when the request is authenticated.
    // The server derives this from the session token — never trust a
    // client-supplied creator id.
    const creator = await authUser(req)
    if (!creator) {
      res.status(401).json({ error: 'Sign in to post an event.' })
      return
    }
    if (!canCreateEvents(creator)) {
      res.status(403).json({ error: 'An @nku.edu email is required to create an event.' })
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
      creatorId: creator.id,
      creatorName: creator?.name ?? null,
      creatorEmail: creator?.email ?? null,
      createdAt: new Date().toISOString(),
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

app.patch('/api/events/:id', async (req, res) => {
  try {
    const title = String(req.body.title ?? '').trim()
    const location = String(req.body.location ?? '').trim()
    if (!title || !location) {
      res.status(400).json({ error: 'Title and location are required.' })
      return
    }

    const existing = await getEvent(req.params.id)
    if (!existing) {
      res.status(404).json({ error: 'Event not found.' })
      return
    }
    const requester = await authUser(req)
    if (!canEditEvent(existing, requester)) {
      res.status(403).json({ error: 'Only the creator of this event can edit it.' })
      return
    }

    const update = {
      title,
      location,
      description: String(req.body.description ?? '').trim(),
      date: String(req.body.date ?? ''),
      time: String(req.body.time ?? ''),
      tags: Array.isArray(req.body.tags) ? req.body.tags : [],
      images: Array.isArray(req.body.images) ? req.body.images : [],
    }
    const saved = await updateEventDoc(req.params.id, update)
    if (!saved) {
      res.status(404).json({ error: 'Event not found.' })
      return
    }

    // eslint-disable-next-line no-unused-vars
    const { _id, ...rest } = saved
    res.json(rest)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Could not update event.' })
  }
})

app.delete('/api/events/:id', async (req, res) => {
  try {
    const existing = await getEvent(req.params.id)
    if (!existing) {
      res.status(404).json({ error: 'Event not found.' })
      return
    }
    const requester = await authUser(req)
    if (!canDeleteEvent(existing, requester)) {
      res.status(403).json({ error: 'Only the creator, an admin, or a developer can remove this event.' })
      return
    }
    const deleted = await deleteEventDoc(req.params.id)
    if (!deleted) {
      res.status(404).json({ error: 'Event not found.' })
      return
    }
    res.json({ ok: true, id: req.params.id })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Could not delete event.' })
  }
})

app.post('/api/events/:id/comments', async (req, res) => {
  try {
    const text = String(req.body.text ?? '').trim()
    if (!text) {
      res.status(400).json({ error: 'Comment text is required.' })
      return
    }

    const commenter = await authUser(req)
    const comment = {
      id: `comment-${Date.now()}`,
      author: commenter?.name?.trim() || String(req.body.author ?? '').trim() || 'Anonymous',
      authorId: commenter?.id ?? null,
      text,
    }
    const appended = await appendEventComment(req.params.id, comment)
    if (!appended) {
      res.status(404).json({ error: 'Event not found.' })
      return
    }
    res.status(201).json(comment)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Could not add comment.' })
  }
})

// Campus day in Eastern Time, so fullness resets at midnight in Highland Heights.
function campusDate(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

async function rankingSummary(date, userId, kind) {
  // One score per place: the newest report from today, not an average of every report.
  // Recreation ratings share the collection and are kept out of parking scores.
  const match = kind === 'rec' ? { date, kind: 'rec' } : { date, kind: { $ne: 'rec' } }
  const grouped = await parkingRankings.aggregate([
    { $match: match },
    { $sort: { updatedAt: -1 } },
    {
      $group: {
        _id: '$placeId',
        rating: { $first: '$rating' },
        reportedAt: { $first: '$updatedAt' },
      },
    },
  ]).toArray()
  const mineDocs = userId
    ? await parkingRankings.find({ ...match, userId }, { projection: { _id: 0, placeId: 1, rating: 1 } }).toArray()
    : []
  const mineByPlace = new Map(mineDocs.map((doc) => [doc.placeId, doc.rating]))
  return {
    date,
    places: grouped.map((row) => ({
      placeId: row._id,
      rating: row.rating,
      reportedAt: row.reportedAt instanceof Date ? row.reportedAt.toISOString() : row.reportedAt ?? null,
      mine: mineByPlace.get(row._id) ?? null,
    })),
  }
}

app.get('/api/parking/fullness', async (req, res) => {
  try {
    if (!parkingRankings) {
      res.status(503).json({ error: 'Parking ratings are unavailable.' })
      return
    }
    const user = await authUser(req)
    res.json(await rankingSummary(campusDate(), user?.id ?? null, 'parking'))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Could not load parking fullness.' })
  }
})

app.post('/api/parking/fullness', async (req, res) => {
  try {
    if (!parkingRankings) {
      res.status(503).json({ error: 'Parking ratings are unavailable.' })
      return
    }
    const user = await authUser(req)
    if (!user) {
      res.status(401).json({ error: 'Sign in to rate parking.' })
      return
    }
    const rating = Number(req.body.rating)
    const placeId = Number(req.body.placeId)
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      res.status(400).json({ error: 'Choose a fullness from 1 to 5.' })
      return
    }
    if (!Number.isInteger(placeId)) {
      res.status(400).json({ error: 'Choose a parking lot or garage.' })
      return
    }
    const place = (await listBuildings()).find((building) => building.id === placeId)
    if (!place || !isParkingPlace(place)) {
      res.status(400).json({ error: 'Choose a parking lot or garage.' })
      return
    }
    const date = campusDate()
    await parkingRankings.updateOne(
      { placeId, userId: user.id, date },
      {
        $set: { rating, updatedAt: new Date().toISOString() },
        $setOnInsert: { placeId, userId: user.id, date },
      },
      { upsert: true },
    )
    res.json(await rankingSummary(date, user.id, 'parking'))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Could not save parking fullness.' })
  }
})

app.get('/api/rec/busyness', async (req, res) => {
  try {
    if (!parkingRankings) {
      res.status(503).json({ error: 'Recreation ratings are unavailable.' })
      return
    }
    const user = await authUser(req)
    res.json(await rankingSummary(campusDate(), user?.id ?? null, 'rec'))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Could not load recreation busyness.' })
  }
})

app.post('/api/rec/busyness', async (req, res) => {
  try {
    if (!parkingRankings) {
      res.status(503).json({ error: 'Recreation ratings are unavailable.' })
      return
    }
    const user = await authUser(req)
    if (!user) {
      res.status(401).json({ error: 'Sign in to rate the recreation center.' })
      return
    }
    const rating = Number(req.body.rating)
    const placeId = Number(req.body.placeId)
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      res.status(400).json({ error: 'Choose a busyness from 1 to 5.' })
      return
    }
    if (!Number.isInteger(placeId)) {
      res.status(400).json({ error: 'Choose the campus recreation center.' })
      return
    }
    const place = (await listBuildings()).find((building) => building.id === placeId)
    if (!place || !isRecreationCenter(place)) {
      res.status(400).json({ error: 'Choose the campus recreation center.' })
      return
    }
    const date = campusDate()
    await parkingRankings.updateOne(
      { placeId, userId: user.id, date },
      {
        $set: { rating, kind: 'rec', updatedAt: new Date().toISOString() },
        $setOnInsert: { placeId, userId: user.id, date },
      },
      { upsert: true },
    )
    res.json(await rankingSummary(date, user.id, 'rec'))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Could not save recreation busyness.' })
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
