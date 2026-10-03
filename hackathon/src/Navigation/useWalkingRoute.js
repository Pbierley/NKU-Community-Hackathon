import { useEffect, useMemo, useState } from 'react'
import { buildGraph, onCampus, shortestPath } from './walkGraph'

function pointKey(point) {
  if (!point) return ''
  return `${Math.round(point[0] * 1e5) / 1e5},${Math.round(point[1] * 1e5) / 1e5}`
}

function fromKey(key) {
  if (!key) return null
  return key.split(',').map(Number)
}

export function useWalkingRoute(from, to) {
  const [nodes, setNodes] = useState(null)
  const startKey = pointKey(from)
  const endKey = pointKey(to)

  useEffect(() => {
    let cancelled = false
    import('./campusWalkways.json').then((mod) => {
      if (!cancelled) setNodes(buildGraph(mod.default))
    })
    return () => {
      cancelled = true
    }
  }, [])

  return useMemo(() => {
    const start = fromKey(startKey)
    const end = fromKey(endKey)
    if (!start || !end) return { route: null, error: null }
    if (!nodes) return { route: null, error: null }
    if (!onCampus(start)) return { route: null, error: 'Walk onto campus to see a path.' }
    if (!onCampus(end)) return { route: null, error: 'That building is outside the walking map.' }
    const route = shortestPath(nodes, start, end)
    if (!route) return { route: null, error: 'No walking path found between you and that building.' }
    return { route, error: null }
  }, [nodes, startKey, endKey])
}
