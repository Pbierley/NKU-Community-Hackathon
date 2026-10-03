const base = 'http://localhost:3001'
const email = 'rec-pin-check@example.com'
const password = 'rec-pin-pass-1'
const registered = await fetch(`${base}/api/auth/register`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'Rec Pin', email, password, year: 'Junior', major: 'Test' }),
})
const session = await registered.json()
const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${session.token}` }
const buildings = await (await fetch(`${base}/api/buildings`)).json()
const rec = buildings.find((building) => building.name === 'Campus Rec Center')
const albright = buildings.find((building) => building.name === 'Albright Health Center')
const onRec = await fetch(`${base}/api/rec/busyness`, {
  method: 'POST',
  headers,
  body: JSON.stringify({ placeId: rec.id, rating: 3 }),
})
const onAlbright = await fetch(`${base}/api/rec/busyness`, {
  method: 'POST',
  headers,
  body: JSON.stringify({ placeId: albright.id, rating: 3 }),
})
console.log(JSON.stringify({
  rec: { id: rec.id, lat: rec.Location.lat, lng: rec.Location.lng, alias: rec.Alias },
  albrightAlias: albright.Alias,
  onRec: onRec.status,
  onAlbright: onAlbright.status,
  userId: session.user.id,
}))
