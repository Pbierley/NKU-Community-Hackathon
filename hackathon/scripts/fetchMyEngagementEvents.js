import { writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ORIGIN = 'https://myengagement.nku.edu'
const LIST_URL = `${ORIGIN}/mobile_ws/v17/mobile_events_list`
const __dirname = dirname(fileURLToPath(import.meta.url))

function stripHtml(value) {
  return String(value ?? '')
    .replace(/&ndash;|–|—/g, '-')
    .replace(/&nbsp;/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function unique(values) {
  return [...new Set(values.map((v) => v.trim()).filter(Boolean))]
}

function rowToFields(row) {
  if (!row?.fields || row.listingSeparator === 'true' || row.p2 === 'separator') return null
  const names = row.fields.split(',').map((name) => name.trim()).filter(Boolean)
  const fields = {}
  names.forEach((name, index) => {
    fields[name] = row[`p${index}`]
  })
  return fields
}

const TAG_EXPAND = {
  'Leadership & Professional Develo': 'Leadership & Professional Development',
}

function parseTags(category, tagsHtml) {
  const fromHtml = [...String(tagsHtml ?? '').matchAll(/>([^<]+)</g)]
    .map((match) => stripHtml(match[1]))
    .map((tag) => TAG_EXPAND[tag.replace(/\.{2,}$/, '').trim()] ?? tag.replace(/\.{2,}$/, '').trim())
    .filter((tag) => tag && tag !== '...')
  return unique([category, ...fromHtml])
}

function parseWhen(datesHtml, aria) {
  const fromDates = stripHtml(datesHtml)
  const range = fromDates.split(' - ').map((part) => part.trim()).filter(Boolean)
  const start = range[0] ?? ''
  const end = range[1] ?? ''

  const startMatch = start.match(/^([A-Za-z]{3}, [A-Za-z]{3} \d{1,2}, \d{4})\s+(.+)$/)
  if (startMatch) {
    const date = new Date(`${startMatch[1]} 12:00:00`)
    const formattedDate = Number.isNaN(date.getTime())
      ? startMatch[1]
      : date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    const time = end && !/^\d{4}/.test(end) && !/[A-Za-z]{3},/.test(end)
      ? `${startMatch[2]} - ${end}`
      : range[1] && /[A-Za-z]{3},/.test(range[1])
        ? `${startMatch[2]} - ${range[1]}`
        : startMatch[2]
    return { date: formattedDate, time }
  }

  const ariaMatch = stripHtml(aria).match(/([A-Za-z]+, \d{1,2} [A-Za-z]+ \d{4}) At (.+?)(?:,|$)/)
  if (ariaMatch) {
    const date = new Date(ariaMatch[1])
    return {
      date: Number.isNaN(date.getTime())
        ? ariaMatch[1]
        : date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      time: ariaMatch[2].replace(/\s+EDT.*$/, '').trim(),
    }
  }

  return { date: fromDates || 'Upcoming', time: '' }
}

function absoluteUrl(path) {
  if (!path) return ''
  if (/^https?:\/\//i.test(path)) return path
  return `${ORIGIN}${path.startsWith('/') ? path : `/${path}`}`
}

function publicLocation(location, clubName) {
  const place = stripHtml(location)
  if (!place || /private location/i.test(place)) {
    return stripHtml(clubName) || 'NKU Campus'
  }
  return place
}

function toEvent(fields) {
  const title = stripHtml(fields.eventName)
  if (!title || !fields.eventId) return null

  const { date, time } = parseWhen(fields.eventDates, fields.ariaEventDetails)
  const host = stripHtml(fields.clubName)
  const location = publicLocation(fields.eventLocation, host)
  const tags = parseTags(fields.eventCategory, fields.eventTags)
  const image = absoluteUrl(fields.eventPicture)
  const photo = stripHtml(fields.eventPhotoDescription)
  const aria = stripHtml(fields.ariaEventDetailsWithLocation)
    .replace(/\s*Private Location \( sign in to display \) \.?/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
  const description = photo && photo.length > 24 && !/^(banner for|the text|alt text)/i.test(photo)
    ? photo
    : aria || (host ? `${host} event listed on MyEngagement.` : title)

  return {
    id: `nku-${fields.eventId}`,
    title,
    description,
    date,
    time,
    location,
    tags: tags.length ? tags : ['Campus'],
    images: image ? [image] : [],
    attendeeIds: [],
    reactions: { like: 0, love: 0, interested: 0 },
    comments: [],
    sourceUrl: absoluteUrl(fields.eventUrl || fields.eventUrlTitle),
    host,
  }
}

async function fetchPage(range, limit) {
  const url = `${LIST_URL}?range=${range}&limit=${limit}`
  const res = await fetch(url, {
    headers: { 'User-Agent': 'NKU-hackathon/1.0 (MyEngagement event import)' },
  })
  if (!res.ok) throw new Error(`${url} ${res.status}`)
  return res.json()
}

async function fetchAllEvents() {
  const pageSize = 100
  const events = []
  let range = 0
  let total = Infinity

  while (range < total) {
    const rows = await fetchPage(range, pageSize)
    if (!Array.isArray(rows) || rows.length === 0) break
    total = Number(rows[0]?.counter ?? events.length)
    for (const row of rows) {
      const fields = rowToFields(row)
      const event = fields && toEvent(fields)
      if (event) events.push(event)
    }
    range += pageSize
    if (rows.length < 2) break
  }

  const seen = new Set()
  return events.filter((event) => {
    if (seen.has(event.id)) return false
    seen.add(event.id)
    return true
  })
}

const events = await fetchAllEvents()
const json = `${JSON.stringify(events, null, 2)}\n`
const targets = [
  join(__dirname, '..', 'src', 'Communication', 'events.json'),
  join(__dirname, '..', 'server', 'data', 'events.json'),
]

await Promise.all(targets.map((path) => writeFile(path, json, 'utf8')))
console.log(`Wrote ${events.length} MyEngagement events to:`)
for (const path of targets) console.log(`  ${path}`)
