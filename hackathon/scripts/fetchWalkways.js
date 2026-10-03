import { writeFile } from 'node:fs/promises'

const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
]

const QUERY = `[out:json][timeout:40];
(
  way["highway"~"^(footway|path|steps|pedestrian|living_street|corridor)$"](39.0245,-84.4725,39.0425,-84.4500);
  way["highway"="service"]["foot"!="no"](39.0245,-84.4725,39.0425,-84.4500);
);
out geom;
`

async function fetchWalkways() {
  let lastError
  for (const url of ENDPOINTS) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
          'User-Agent': 'NKU-hackathon/1.0 (campus walking paths)',
        },
        body: QUERY,
      })
      if (!res.ok) throw new Error(`${url} ${res.status}`)
      const data = await res.json()
      return data.elements.filter((el) => el.type === 'way' && el.geometry?.length > 1)
    } catch (err) {
      lastError = err
    }
  }
  throw lastError
}

export function simplifyWays(elements) {
  return elements.map((el) => ({
    highway: el.tags?.highway ?? 'footway',
    geometry: el.geometry.map((p) => [p.lat, p.lon]),
  }))
}

const dest = new URL('../src/Navigation/campusWalkways.json', import.meta.url)
const ways = simplifyWays(await fetchWalkways())
await writeFile(dest, JSON.stringify(ways))
console.log(`wrote ${ways.length} ways to ${dest.pathname}`)
