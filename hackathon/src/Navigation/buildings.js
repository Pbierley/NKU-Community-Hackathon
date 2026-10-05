import { useEffect, useState } from 'react'
import { apiUrl } from '../api'

export { isParkingPlace, isRecreationCenter, lotSuggestedFor, parkingPermitLabel } from './parkingPlaces.js'

export function useBuildings() {
  const [state, setState] = useState({ buildings: [], loading: true, error: null })

  useEffect(() => {
    const controller = new AbortController()
    fetch(apiUrl('/api/buildings'), { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`Server responded ${res.status}`)
        return res.json()
      })
      .then((buildings) => setState({ buildings, loading: false, error: null }))
      .catch((err) => {
        if (err.name === 'AbortError') return
        setState({ buildings: [], loading: false, error: `Could not load buildings: ${err.message}` })
      })
    return () => controller.abort()
  }, [])

  return state
}

// Leaflet throws on a non-numeric lat/lng, which blanks the whole app.
export function hasLocation(building) {
  return Number.isFinite(building.Location?.lat) && Number.isFinite(building.Location?.lng)
}

export function getBuildingById(buildings, id) {
  return buildings.find((b) => b.id === id) ?? null
}

function placeWords(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter((word) => word.length > 1 || /^[a-z]$/.test(word))
    .map((word) => (word.endsWith('s') && word.length > 3 ? word.slice(0, -1) : word))
}

// Event locations are place names ("Steely Library", "Fine Art Center 305").
// Match the name or an alias, including a room number after the building name.
export function findBuildingForLocation(buildings, location) {
  const query = placeWords(location)
  if (query.length === 0) return null
  const haystack = String(location).toLowerCase()
  let best = null
  let bestScore = 0
  let bestIndex = Infinity
  for (const building of buildings) {
    if (!hasLocation(building)) continue
    const labels = [building.name, ...(building.Alias ?? [])]
    for (const label of labels) {
      const words = placeWords(label)
      if (words.length === 0) continue
      const shared = words.filter((word) => query.includes(word)).length
      if (shared === 0) continue
      const coversLabel = shared === words.length
      const coversQuery = shared === query.length
      const singleLetterLabel = words.length === 1 && words[0].length === 1
      if (singleLetterLabel ? !(coversLabel && coversQuery) : !coversLabel && !coversQuery) continue
      const score = shared * 10 + (coversLabel && coversQuery ? 50 : coversLabel ? 20 : 0)
      const at = haystack.indexOf(String(label).toLowerCase())
      const index = at === -1 ? 9999 : at
      if (score > bestScore || (score === bestScore && index < bestIndex)) {
        bestScore = score
        bestIndex = index
        best = building
      }
    }
  }
  return best
}

function matchRank(building, q) {
  const name = building.name.toLowerCase()
  const aliases = building.Alias.map((a) => a.toLowerCase())
  if (String(building.id) === q || aliases.includes(q)) return 0
  if (name.startsWith(q)) return 1
  if (aliases.some((a) => a.startsWith(q))) return 2
  if (name.includes(q)) return 3
  if (aliases.some((a) => a.includes(q))) return 4
  return -1
}

// Matches map number, building code, name, or any alias, best matches first.
export function searchBuildings(buildings, query, limit = 8) {
  const q = query.trim().toLowerCase()
  if (!q) return []
  return buildings
    .map((b) => ({ b, rank: matchRank(b, q) }))
    .filter((r) => r.rank >= 0)
    .sort((x, y) => x.rank - y.rank || x.b.id - y.b.id)
    .slice(0, limit)
    .map((r) => r.b)
}

// Codes are the short all-caps aliases from the campus map legend, e.g. "GH".
export function buildingCode(building) {
  return building.Alias.find((a) => /^[A-Z]{2,4}$/.test(a)) ?? null
}

// Lot letters and building codes. Falls back to the map number when there is no code.
export function mapLabel(building) {
  const letter = building.Alias.find((a) => /^[A-Z]$/.test(a))
  return letter ?? buildingCode(building) ?? String(building.id)
}
