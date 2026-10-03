import express from 'express'
import { MongoClient } from 'mongodb'

const uri = process.env.MongoURI
if (!uri) {
  console.error('MongoURI is not set. Run with: npm run server')
  process.exit(1)
}

const port = Number(process.env.PORT ?? 3001)
const client = new MongoClient(uri)
await client.connect()
const db = client.db(process.env.MongoDB ?? 'hackathon')
const buildings = db.collection('buildings')
const events = db.collection('Events')
const CURRENT_USER = 'current-user'

const app = express()
app.use(express.json())

app.get('/api/buildings', async (req, res) => {
  try {
    const docs = await buildings.find({}, { projection: { _id: 0 } }).sort({ id: 1 }).toArray()
    res.json(docs)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Could not load buildings.' })
  }
})

app.get('/api/events', async (req, res) => {
  try {
    const docs = await events.find({}, { projection: { _id: 0 } }).sort({ id: 1 }).toArray()
    res.json(docs)
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
    await events.insertOne({ ...doc })
    res.status(201).json(doc)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Could not create event.' })
  }
})

app.patch('/api/events/:id/register', async (req, res) => {
  try {
    const event = await events.findOne({ id: req.params.id })
    if (!event) {
      res.status(404).json({ error: 'Event not found.' })
      return
    }
    const ids = event.attendeeIds ?? []
    const attendeeIds = ids.includes(CURRENT_USER)
      ? ids.filter((id) => id !== CURRENT_USER)
      : [...ids, CURRENT_USER]
    await events.updateOne({ id: event.id }, { $set: { attendeeIds } })
    delete event._id
    res.json({ ...event, attendeeIds })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Could not update registration.' })
  }
})

app.listen(port, () => console.log(`API listening on http://localhost:${port}`))
