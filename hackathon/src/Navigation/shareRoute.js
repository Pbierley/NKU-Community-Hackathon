// Share links stay in the hash so they work without a server route.
// `#/go/<id>` opens the map on that place.
// `#/park/<lotId>/<placeId>` opens the walk from that lot or garage to that place.

function pageUrl() {
  const origin = typeof window === 'undefined' ? '' : window.location.origin
  const path = typeof window === 'undefined' ? '/' : window.location.pathname
  const search = typeof window === 'undefined' ? '' : window.location.search
  return { origin, path, search }
}

function readId(value) {
  if (!/^\d+$/.test(String(value ?? ''))) return null
  const id = Number(value)
  return Number.isSafeInteger(id) ? id : null
}

export function parseRouteHash(hash) {
  const raw = hash ?? (typeof window === 'undefined' ? '' : window.location.hash)
  const go = /^#\/go\/(\d+)\/?$/.exec(raw ?? '')
  if (go) {
    const toId = readId(go[1])
    return toId == null ? null : { kind: 'go', toId }
  }
  const park = /^#\/park\/(\d+)\/(\d+)\/?$/.exec(raw ?? '')
  if (park) {
    const fromId = readId(park[1])
    const toId = readId(park[2])
    if (fromId == null || toId == null) return null
    return { kind: 'park', fromId, toId }
  }
  return null
}

export function buildGoUrl(placeId) {
  const { origin, path } = pageUrl()
  return `${origin}${path}#/go/${placeId}`
}

export function buildParkUrl(lotId, placeId) {
  const { origin, path } = pageUrl()
  return `${origin}${path}#/park/${lotId}/${placeId}`
}

export function clearRouteHash() {
  try {
    if (!parseRouteHash()) return
    const { path, search } = pageUrl()
    window.history.replaceState(null, '', `${path}${search}`)
  } catch {
    /* hash cleanup is best-effort */
  }
}

function rememberRouteHash(url) {
  try {
    const hash = new URL(url).hash
    const { path, search } = pageUrl()
    window.history.replaceState(null, '', `${path}${search}${hash}`)
  } catch {
    /* hash sync is best-effort */
  }
}

export async function copyShareUrl(url) {
  rememberRouteHash(url)
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url)
      return true
    }
    const field = document.createElement('textarea')
    field.value = url
    field.style.position = 'fixed'
    field.style.opacity = '0'
    document.body.appendChild(field)
    field.select()
    const copied = document.execCommand('copy')
    document.body.removeChild(field)
    return copied
  } catch {
    return false
  }
}
