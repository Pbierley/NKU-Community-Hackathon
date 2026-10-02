import data from '../../../Buildings.json'

export const BUILDINGS = data.buildings

export const MAPPED_BUILDINGS = BUILDINGS.filter((b) => b.Location)

export function getBuildingById(id) {
  return BUILDINGS.find((b) => b.id === id) ?? null
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
export function searchBuildings(query, limit = 8) {
  const q = query.trim().toLowerCase()
  if (!q) return []
  return BUILDINGS.map((b) => ({ b, rank: matchRank(b, q) }))
    .filter((r) => r.rank >= 0)
    .sort((x, y) => x.rank - y.rank || x.b.id - y.b.id)
    .slice(0, limit)
    .map((r) => r.b)
}

// Codes are the short all-caps aliases from the campus map legend, e.g. "GH".
export function buildingCode(building) {
  return building.Alias.find((a) => /^[A-Z]{2,4}$/.test(a)) ?? null
}
