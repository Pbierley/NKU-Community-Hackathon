import { readFile } from 'node:fs/promises'
import { MongoClient } from 'mongodb'

const seed = JSON.parse(await readFile(new URL('../../Buildings.json', import.meta.url), 'utf8'))
const rec = seed.buildings.find((building) => building.name === 'Campus Rec Center')
const albright = seed.buildings.find((building) => building.name === 'Albright Health Center')
const client = new MongoClient(process.env.MongoURI)
await client.connect()
const coll = client.db(process.env.MongoDB ?? 'hackathon').collection('buildings')
const byName = await coll.findOne({ name: 'Campus Rec Center' }, { projection: { _id: 0 } })
let savedId = byName?.id ?? rec.id
if (!byName) {
  const taken = await coll.findOne({ id: rec.id }, { projection: { name: 1 } })
  if (taken) {
    const max = await coll.find({}, { projection: { id: 1 } }).sort({ id: -1 }).limit(1).next()
    savedId = (Number(max?.id) || 0) + 1
  }
  await coll.insertOne({ ...rec, id: savedId })
} else {
  await coll.updateOne(
    { name: 'Campus Rec Center' },
    { $set: { Alias: rec.Alias, Location: rec.Location, parking: false } },
  )
}
const albrightResult = await coll.updateOne(
  { name: 'Albright Health Center' },
  { $set: { Alias: albright.Alias } },
)
const stored = await coll.findOne({ name: 'Campus Rec Center' }, { projection: { _id: 0 } })
console.log(JSON.stringify({
  savedId,
  location: stored?.Location,
  aliases: stored?.Alias,
  albrightUpdated: albrightResult.modifiedCount,
}))
await client.close()
