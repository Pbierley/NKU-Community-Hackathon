import { hasLocation } from './buildings'
import { haversineMeters, shortestPath } from './walkGraph'

function pathMeters(route) {
  let meters = 0
  for (let i = 1; i < route.length; i++) meters += haversineMeters(route[i - 1], route[i])
  return meters
}

// Shortest walk on the campus path graph from a lot to the building.
// Lots the graph cannot reach are skipped so the suggestion is a real path.
export function closestParkingRoute(nodes, lots, destination) {
  if (!nodes || !destination || !hasLocation(destination)) return null
  const to = [destination.Location.lat, destination.Location.lng]
  let best = null
  for (const lot of lots) {
    if (!hasLocation(lot) || lot.id === destination.id) continue
    const from = [lot.Location.lat, lot.Location.lng]
    const route = shortestPath(nodes, from, to)
    if (!route || route.length < 2) continue
    const meters = pathMeters(route)
    if (!best || meters < best.meters) best = { lot, route, meters }
  }
  return best
}

export function formatWalk(meters) {
  const minutes = Math.max(1, Math.round(meters / 80))
  const feet = Math.round((meters * 3.28084) / 10) * 10
  const time = `about ${minutes} min`
  if (feet < 1000) return `${feet.toLocaleString('en-US')} ft · ${time}`
  const miles = meters / 1609.344
  const milesText = miles < 10 ? miles.toFixed(1) : String(Math.round(miles))
  return `${milesText} mi · ${time}`
}
