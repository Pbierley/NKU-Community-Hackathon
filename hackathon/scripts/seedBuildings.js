import { readFile } from 'node:fs/promises'
import { MongoClient } from 'mongodb'

const uri = process.env.MongoURI
if (!uri) {
  console.error('MongoURI is not set. Run with: npm run seed:buildings')
  process.exit(1)
}

const dbName = process.env.MongoDB ?? 'hackathon'
const { buildings } = JSON.parse(
  await readFile(new URL('../../Buildings.json', import.meta.url), 'utf8'),
)

const client = new MongoClient(uri)
try {
  await client.connect()
  const collection = client.db(dbName).collection('buildings')
  await collection.createIndex({ id: 1 }, { unique: true })

  // Upserting by map number keeps re-runs from creating duplicates.
  const result = await collection.bulkWrite(
    buildings.map((b) => ({
      replaceOne: { filter: { id: b.id }, replacement: b, upsert: true },
    })),
  )

  const total = await collection.countDocuments()
  console.log(
    `${dbName}.buildings: ${result.upsertedCount} inserted, ${result.modifiedCount} updated, ${total} total`,
  )
} finally {
  await client.close()
}
