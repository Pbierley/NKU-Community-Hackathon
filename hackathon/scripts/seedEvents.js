import { readFile } from 'node:fs/promises'
import { MongoClient } from 'mongodb'

const uri = process.env.MongoURI
if (!uri || uri === 'KEYTIME') {
  console.error('MongoURI is not set. Run with: npm run seed:events')
  process.exit(1)
}

const dbName = process.env.MongoDB ?? 'hackathon'
const events = JSON.parse(
  await readFile(new URL('../src/Communication/events.json', import.meta.url), 'utf8'),
)

const client = new MongoClient(uri)
try {
  await client.connect()
  const collection = client.db(dbName).collection('Events')
  await collection.createIndex({ id: 1 }, { unique: true })

  const result = await collection.bulkWrite(
    events.map((event) => ({
      replaceOne: { filter: { id: event.id }, replacement: event, upsert: true },
    })),
  )

  const total = await collection.countDocuments()
  console.log(
    `${dbName}.Events: ${result.upsertedCount} inserted, ${result.modifiedCount} updated, ${total} total`,
  )
} finally {
  await client.close()
}
