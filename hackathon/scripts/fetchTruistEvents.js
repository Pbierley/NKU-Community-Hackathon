import { readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { MongoClient } from 'mongodb'

const ORIGIN = 'https://thetruistarena.com'
const LIST_URL = `${ORIGIN}/`
const __dirname = dirname(fileURLToPath(import.meta.url))

const NOTICE_SLUGS = new Set([
  'security-measures',
  'truist-arena-is-cashless',
])

function decode(value) {
  return String(value ?? '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&ndash;|&#8211;/g, '-')
    .replace(/&mdash;|&#8212;/g, '-')
    .replace(/&rsquo;|&#8217;|&lsquo;|&#8216;/g, "'")
    .replace(/&ldquo;|&#8220;|&rdquo;|&#8221;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
}

function stripHtml(value) {
  return decode(value)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
}

function sliceBetween(html, startMarker, endMarker) {
  const start = html.indexOf(startMarker)
  if (start < 0) return ''
  const end = html.indexOf(endMarker, start + startMarker.length)
  return html.slice(start, end < 0 ? undefined : end)
}

function slugFromUrl(url) {
  const path = new URL(url).pathname.replace(/\/$/, '')
  return path.split('/').pop()
}

function normalizeClock(value) {
  const match = String(value ?? '').trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i)
  if (!match) return String(value ?? '').trim()
  const hour = Number(match[1])
  const minutes = match[2] ?? '00'
  const suffix = match[3].toUpperCase()
  return minutes === '00' ? `${hour} ${suffix}` : `${hour}:${minutes} ${suffix}`
}

function formatIsoDate(iso) {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'America/New_York',
  })
}

function tagsFor(title) {
  const text = title.toLowerCase()
  if (/basketball|norse/.test(text)) return ['Athletics']
  if (/wrestling|monster truck|hot wheels/.test(text)) return ['Sports']
  return ['Music']
}

function priceLine(offers) {
  const prices = (offers ?? [])
    .map((offer) => Number(offer.price))
    .filter((price) => Number.isFinite(price) && price > 0)
  if (!prices.length) return ''
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  return min === max ? `Tickets $${min}.` : `Tickets $${min}-$${max}.`
}

function parseJsonLd(html) {
  const match = html.match(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/i)
  if (!match) return null
  try {
    return JSON.parse(match[1])
  } catch {
    return null
  }
}

function parseListingCards(html) {
  const list = sliceBetween(html, '<ul class="events-list">', '</ul>')
  const cards = list.split('<li class="float-container">').slice(1)
  return cards.map((card) => {
    const link = card.match(/class="box-link"[^>]*href="([^"]+)"|href="([^"]+)"[^>]*class="box-link"/)
    const url = decode(link?.[1] || link?.[2] || '')
    const title = stripHtml(card.match(/<h2>([\s\S]*?)<\/h2>/)?.[1] ?? '')
    const subtitle = stripHtml(card.match(/<h3>([\s\S]*?)<\/h3>/)?.[1] ?? '')
    const when = stripHtml(card.match(/<time>\s*<span>([\s\S]*?)<\/span>\s*<\/time>/)?.[1] ?? '')
    const image = decode(card.match(/background-image:url\('([^']+)'\)/)?.[1] ?? '')
    const ticket = decode(card.match(/href="(https:\/\/www\.ticketmaster\.com[^"]+)"/)?.[1] ?? '')
    const facts = [...card.matchAll(/<span class="label">([\s\S]*?)<\/span>\s*(?:<span class="value">([\s\S]*?)<\/span>)?/g)]
      .map((match) => ({
        label: stripHtml(match[1]).replace(/:$/, ''),
        value: stripHtml(match[2] ?? ''),
      }))
      .filter((fact) => fact.label && !/important information/i.test(fact.label))
    return { url, title, subtitle, when, image, ticket, facts }
  }).filter((card) => card.url && card.title)
}

function factPairs(block) {
  const doors = []
  const shows = []
  const chunks = block.split(/<span class="label">/).slice(1)
  for (const chunk of chunks) {
    const label = stripHtml(chunk.split('</span>')[0] ?? '').replace(/:$/, '')
    const value = normalizeClock(stripHtml(chunk.match(/<span class="value">([\s\S]*?)<\/span>/)?.[1] ?? ''))
    if (!value) continue
    if (/door/i.test(label)) doors.push(value)
    else if (/show/i.test(label)) shows.push(value)
  }
  return { doors, shows }
}

function performancesFromPage(html) {
  const list = sliceBetween(html, 'class="multiple-performances-list"', 'class="event-description"')
  if (!list) return []
  return list.split('<div class="item">').slice(1).map((item) => {
    const date = stripHtml(item.match(/<div class="date">([\s\S]*?)<\/div>/)?.[1] ?? '')
    const slots = item.split('<div class="time">').slice(1).map((slot) => factPairs(slot))
    return {
      date,
      doors: slots.flatMap((slot) => slot.doors),
      shows: slots.flatMap((slot) => slot.shows),
    }
  }).filter((show) => show.date && (show.doors.length || show.shows.length))
}

function timeLabel(listing, headerShows, startDate) {
  if (headerShows.length > 1 || headerShows.some((show) => show.shows.length > 1)) {
    return headerShows.map((show) => {
      const slots = show.shows.map((time, index) => {
        const door = show.doors[index]
        return door ? `Doors ${door}, Show ${time}` : `Show ${time}`
      })
      return `${show.date}: ${slots.join('; ')}`
    }).join('. ')
  }

  const doors = listing.facts.find((fact) => /door/i.test(fact.label))?.value
  const show = listing.facts.find((fact) => /show/i.test(fact.label))?.value
  const extra = listing.facts
    .filter((fact) => !/door|show|indoor/i.test(fact.label))
    .map((fact) => fact.value ? `${fact.label} ${fact.value}` : fact.label)
  const parts = []
  if (doors) parts.push(`Doors ${normalizeClock(doors)}`)
  if (show) parts.push(`Show ${normalizeClock(show)}`)
  else if (startDate) {
    const date = new Date(startDate)
    if (!Number.isNaN(date.getTime())) {
      const clock = date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        timeZone: 'America/New_York',
      })
      if (clock !== '12:00 AM') parts.push(clock.replace(':00', ''))
    }
  }
  parts.push(...extra)
  return parts.join(' • ')
}

function toEvent(listing, detailHtml) {
  const slug = slugFromUrl(listing.url)
  if (NOTICE_SLUGS.has(slug)) return null

  const ld = parseJsonLd(detailHtml) ?? {}
  const article = detailHtml.match(/<section class="event-description"[\s\S]*?<article>([\s\S]*?)<\/article>/i)?.[1] ?? ''
  const descriptionBody = stripHtml(article)
  const lineup = listing.subtitle && listing.subtitle !== listing.title ? listing.subtitle : ''
  const tickets = priceLine(ld.offers)
  const description = [lineup, descriptionBody, tickets].filter(Boolean).join('\n\n')
    || ld.description
    || `${listing.title} at Truist Arena.`

  const headerShows = performancesFromPage(detailHtml)
  const ranged = listing.when.includes(' - ')
  const date = ranged
    ? listing.when
    : formatIsoDate(ld.startDate) || listing.when || 'Upcoming'

  const image = ld.image || listing.image
  const ticketUrl = listing.ticket || ld.offers?.find((offer) => offer.url)?.url || ''

  return {
    id: `truist-${slug}`,
    title: listing.title,
    description: ticketUrl && !/ticket/i.test(description)
      ? `${description}\n\nBuy tickets: ${ticketUrl}`
      : description,
    date,
    time: timeLabel(listing, headerShows, ranged ? '' : ld.startDate),
    location: 'Truist Arena',
    tags: tagsFor(listing.title),
    images: image ? [image] : [],
    attendeeIds: [],
    reactions: { like: 0, love: 0, interested: 0 },
    comments: [],
    sourceUrl: listing.url,
    host: 'Truist Arena',
  }
}

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'NKU-hackathon/1.0 (Truist Arena event import)' },
  })
  if (!res.ok) throw new Error(`${url} responded ${res.status}`)
  return res.text()
}

function mergeEvents(existing, incoming) {
  const existingIds = new Set(existing.map((event) => event.id))
  const incomingById = new Map(incoming.map((event) => [event.id, event]))
  const updated = existing.map((event) => {
    const next = incomingById.get(event.id)
    if (!next) return event
    return {
      ...next,
      attendeeIds: event.attendeeIds ?? [],
      reactions: event.reactions ?? next.reactions,
      comments: event.comments ?? [],
    }
  })
  return [...updated, ...incoming.filter((event) => !existingIds.has(event.id))]
}

async function readEvents(path) {
  try {
    const parsed = JSON.parse(await readFile(path, 'utf8'))
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

async function upsertMongo(events) {
  const uri = (process.env.MongoURI ?? '').trim()
  if (!uri || uri === 'KEYTIME') {
    console.log('MongoURI is unset. Skipped the database upsert.')
    return
  }
  const dbName = process.env.MongoDB ?? 'hackathon'
  const client = new MongoClient(uri)
  try {
    await client.connect()
    const collection = client.db(dbName).collection('Events')
    await collection.createIndex({ id: 1 }, { unique: true })
    let inserted = 0
    let updated = 0
    for (const event of events) {
      const current = await collection.findOne({ id: event.id })
      const doc = {
        ...event,
        attendeeIds: current?.attendeeIds ?? event.attendeeIds,
        reactions: current?.reactions ?? event.reactions,
        comments: current?.comments ?? event.comments,
      }
      const result = await collection.replaceOne({ id: event.id }, doc, { upsert: true })
      if (result.upsertedCount) inserted += 1
      else if (result.modifiedCount) updated += 1
    }
    const total = await collection.countDocuments()
    console.log(`${dbName}.Events: ${inserted} inserted, ${updated} updated, ${total} total`)
  } finally {
    await client.close()
  }
}

const homepage = await fetchHtml(LIST_URL)
const listings = parseListingCards(homepage)
const events = []
for (const listing of listings) {
  const detail = await fetchHtml(listing.url)
  const event = toEvent(listing, detail)
  if (event) events.push(event)
  else console.log(`Skipped venue notice: ${listing.title}`)
}

const targets = [
  join(__dirname, '..', 'src', 'Communication', 'events.json'),
  join(__dirname, '..', 'server', 'data', 'events.json'),
]

for (const path of targets) {
  const existing = await readEvents(path)
  const merged = mergeEvents(existing, events)
  await writeFile(path, `${JSON.stringify(merged, null, 2)}\n`, 'utf8')
  console.log(`Wrote ${events.length} Truist events into ${merged.length} total at ${path}`)
}

await upsertMongo(events)

console.log('Imported:')
for (const event of events) {
  console.log(`- ${event.title} | ${event.date} | ${event.time || 'time TBD'}`)
}
