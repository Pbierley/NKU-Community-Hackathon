import { useEffect, useMemo, useState } from 'react'
import { buildGraph, onCampus, shortestPath } from './walkGraph'

const AVOID_STAIRS_KEY = 'nku-avoid-stairs'

function pointKey(point) {
  if (!point) return ''
  return `${Math.round(point[0] * 1e5) / 1e5},${Math.round(point[1] * 1e5) / 1e5}`
}

function fromKey(key) {
  if (!key) return null
  return key.split(',').map(Number)
}

let graphsPromise = null

function loadGraphs() {
  if (!graphsPromise) {
    graphsPromise = import('./campusWalkways.json').then((mod) => ({
      normal: buildGraph(mod.default),
      avoidStairs: buildGraph(mod.default, { avoidStairs: true }),
    }))
  }
  return graphsPromise
}

export function useAvoidStairs() {
  const [avoidStairs, setAvoidStairs] = useState(() => {
    try {
      return localStorage.getItem(AVOID_STAIRS_KEY) === '1'
    } catch {
      return false
    }
  })

  function setAvoid(next) {
    setAvoidStairs(next)
    try {
      localStorage.setItem(AVOID_STAIRS_KEY, next ? '1' : '0')
    } catch {
      /* the choice still applies for this visit */
    }
  }

  return [avoidStairs, setAvoid]
}

export function useWalkGraph(avoidStairs = false) {
  const [graphs, setGraphs] = useState(null)

  useEffect(() => {
    let cancelled = false
    loadGraphs().then((next) => {
      if (!cancelled) setGraphs(next)
    })
    return () => {
      cancelled = true
    }
  }, [])

  if (!graphs) return null
  return avoidStairs ? graphs.avoidStairs : graphs.normal
}

export function useWalkingRoute(from, to, avoidStairs = false) {
  const nodes = useWalkGraph(avoidStairs)
  const startKey = pointKey(from)
  const endKey = pointKey(to)

  return useMemo(() => {
    const start = fromKey(startKey)
    const end = fromKey(endKey)
    if (!start || !end) return { route: null, error: null }
    if (!nodes) return { route: null, error: null }
    if (!onCampus(start)) return { route: null, error: 'Walk onto campus to see a path.' }
    if (!onCampus(end)) return { route: null, error: 'That building is outside the walking map.' }
    const route = shortestPath(nodes, start, end)
    if (!route) {
      return {
        route: null,
        error: avoidStairs
          ? 'No stair-free walking path found between you and that building.'
          : 'No walking path found between you and that building.',
      }
    }
    return { route, error: null }
  }, [nodes, startKey, endKey, avoidStairs])
}
