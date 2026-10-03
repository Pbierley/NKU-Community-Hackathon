import { readFile } from 'node:fs/promises'
import { MongoClient } from 'mongodb'

const uri = process.env.MongoURI
if (!uri) {
  console.error('MongoURI is not set. Run with: npm run seed:walkways')
  process.exit(1)
}

const dbName = process.env.MongoDB ?? 'hackathon'
const ways = JSON.parse(
  await readFile(new URL('../src/Navigation/campusWalkways.json', import.meta.url), 'utf8'),
)

if (!Array.isArray(ways) || ways.length === 0) {
  console.error('campusWalkways.json has no paths to store.')
  process.exit(1)
}

const client = new MongoClient(uri)
try {
  await client.connect()
  const collection = client.db(dbName).collection('walkways')
  await collection.createIndex({ id: 1 }, { unique: true })

  // The file is a full snapshot, so a re-run replaces every path.
  await collection.deleteMany({})
  await collection.insertMany(
    ways.map((way, index) => ({
      id: index + 1,
      highway: way.highway,
      geometry: way.geometry,
    })),
  )

  const total = await collection.countDocuments()
  console.log(`${dbName}.walkways: ${total} paths stored`)
} finally {
  await client.close()
}
