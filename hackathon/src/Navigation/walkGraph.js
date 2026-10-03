import { NKU_BOUNDS } from './nkuMap.js'

const EARTH_M = 6371000
const STITCH_M = 8
const SNAP_M = 90

function toRad(deg) {
  return (deg * Math.PI) / 180
}

export function haversineMeters(a, b) {
  const dLat = toRad(b[0] - a[0])
  const dLng = toRad(b[1] - a[1])
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_M * Math.asin(Math.min(1, Math.sqrt(x)))
}

function nodeId(lat, lng) {
  return `${lat.toFixed(6)},${lng.toFixed(6)}`
}

function ensure(nodes, lat, lng) {
  const id = nodeId(lat, lng)
  let node = nodes.get(id)
  if (!node) {
    node = { id, lat, lng, edges: [] }
    nodes.set(id, node)
  }
  return node
}

function link(a, b, weight) {
  if (a.id === b.id || weight <= 0) return
  a.edges.push({ to: b.id, weight })
  b.edges.push({ to: a.id, weight })
}

function stitchNearby(nodes) {
  const cellDeg = STITCH_M / 111_000
  const grid = new Map()
  for (const node of nodes.values()) {
    const key = `${Math.round(node.lat / cellDeg)}:${Math.round(node.lng / cellDeg)}`
    if (!grid.has(key)) grid.set(key, [])
    grid.get(key).push(node)
  }

  for (const bucket of grid.values()) {
    for (let i = 0; i < bucket.length; i++) {
      for (let j = i + 1; j < bucket.length; j++) {
        const d = haversineMeters([bucket[i].lat, bucket[i].lng], [bucket[j].lat, bucket[j].lng])
        if (d > 0 && d <= STITCH_M) link(bucket[i], bucket[j], d)
      }
    }
  }
}

export function buildGraph(ways) {
  const nodes = new Map()
  for (const way of ways) {
    const pts = way.geometry
    if (!pts || pts.length < 2) continue
    const cost = way.highway === 'steps' ? 1.6 : 1
    for (let i = 0; i < pts.length - 1; i++) {
      const a = ensure(nodes, pts[i][0], pts[i][1])
      const b = ensure(nodes, pts[i + 1][0], pts[i + 1][1])
      link(a, b, haversineMeters([a.lat, a.lng], [b.lat, b.lng]) * cost)
    }
  }
  stitchNearby(nodes)
  return nodes
}

export function nearestNode(nodes, point, maxMeters = SNAP_M) {
  let best = null
  let bestD = maxMeters
  for (const node of nodes.values()) {
    const d = haversineMeters(point, [node.lat, node.lng])
    if (d < bestD) {
      bestD = d
      best = node
    }
  }
  return best
}

export function onCampus(point, padMeters = 200) {
  const [[s, w], [n, e]] = NKU_BOUNDS
  const padLat = padMeters / 111_000
  const padLng = padMeters / (111_000 * Math.cos(toRad((s + n) / 2)))
  return point[0] >= s - padLat && point[0] <= n + padLat && point[1] >= w - padLng && point[1] <= e + padLng
}

function popClosest(open, dist) {
  let bestId = null
  let bestD = Infinity
  for (const id of open) {
    const d = dist.get(id) ?? Infinity
    if (d < bestD) {
      bestD = d
      bestId = id
    }
  }
  if (bestId != null) open.delete(bestId)
  return [bestId, bestD]
}

export function shortestPath(nodes, from, to) {
  const start = nearestNode(nodes, from)
  const end = nearestNode(nodes, to)
  if (!start || !end) return null

  if (start.id === end.id) return [from, [start.lat, start.lng], to]

  const dist = new Map([[start.id, 0]])
  const prev = new Map()
  const open = new Set([start.id])
  const seen = new Set()

  while (open.size > 0) {
    const [id, d] = popClosest(open, dist)
    if (id == null || d === Infinity) break
    if (id === end.id) break
    if (seen.has(id)) continue
    seen.add(id)
    for (const edge of nodes.get(id).edges) {
      if (seen.has(edge.to)) continue
      const next = d + edge.weight
      if (next < (dist.get(edge.to) ?? Infinity)) {
        dist.set(edge.to, next)
        prev.set(edge.to, id)
        open.add(edge.to)
      }
    }
  }

  if (!prev.has(end.id)) return null

  const path = []
  for (let cur = end.id; cur; cur = prev.get(cur)) {
    const node = nodes.get(cur)
    path.push([node.lat, node.lng])
    if (cur === start.id) break
  }
  path.reverse()
  path.unshift(from)
  path.push(to)
  return path
}
