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
const buildings = client.db(process.env.MongoDB ?? 'hackathon').collection('buildings')

const app = express()

app.get('/api/buildings', async (req, res) => {
  try {
    const docs = await buildings.find({}, { projection: { _id: 0 } }).sort({ id: 1 }).toArray()
    res.json(docs)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Could not load buildings.' })
  }
})

app.listen(port, () => console.log(`API listening on http://localhost:${port}`))
