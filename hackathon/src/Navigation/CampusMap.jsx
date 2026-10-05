import { useEffect, useRef } from 'react'
import {
  AttributionControl,
  Circle,
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from 'react-leaflet'
import L from './leaflet'
import { getBuildingById, hasLocation, mapLabel } from './buildings'
import { NKU_BOUNDS, NKU_CENTER } from './nkuMap'

const USER_BLUE = '#2563EB'

const ARROW_SVG = `
  <svg viewBox="0 0 40 40" width="40" height="40" aria-hidden="true">
    <path d="M20 3 L33 35 L20 28 L7 35 Z" fill="${USER_BLUE}" stroke="#fff" stroke-width="3" stroke-linejoin="round" />
  </svg>`

const DOT_SVG = `
  <svg viewBox="0 0 48 48" width="48" height="48" aria-hidden="true">
    <circle cx="24" cy="24" r="24" fill="rgba(47,124,246,0.2)" />
    <circle cx="24" cy="24" r="9" fill="${USER_BLUE}" stroke="#fff" stroke-width="3" />
  </svg>`

function UserArrow({ position, heading }) {
  const map = useMap()
  const markerRef = useRef(null)
  const hasHeading = heading !== null

  useEffect(() => {
    const size = hasHeading ? 40 : 48
    const icon = L.divIcon({
      className: 'user-arrow',
      html: `<div class="user-arrow__inner">${hasHeading ? ARROW_SVG : DOT_SVG}</div>`,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    })
    const marker = L.marker(position, { icon, interactive: false, keyboard: false }).addTo(map)
    markerRef.current = marker
    return () => {
      marker.remove()
      markerRef.current = null
    }
    // Position and heading are applied below without rebuilding the marker.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, hasHeading])

  useEffect(() => {
    markerRef.current?.setLatLng(position)
  }, [position])

  useEffect(() => {
    const inner = markerRef.current?.getElement()?.querySelector('.user-arrow__inner')
    if (inner) inner.style.transform = `rotate(${heading ?? 0}deg)`
  }, [heading, hasHeading])

  return null
}

const PIN_SIZES = { normal: 28, selected: 40, dimmed: 12 }
const buildingIcons = new Map()

function pinBox(label, state) {
  if (state === 'dimmed') return [12, 12]
  const height = PIN_SIZES[state]
  const width = height + Math.max(0, String(label).length - 2) * (state === 'selected' ? 11 : 9)
  return [width, height]
}

function buildingIcon(id, state, label) {
  const key = `${id}-${state}-${label}`
  if (!buildingIcons.has(key)) {
    const [width, height] = pinBox(label, state)
    buildingIcons.set(
      key,
      L.divIcon({
        className: `building-pin building-pin--${state}`,
        html: state === 'dimmed' ? '' : `<span>${label}</span>`,
        iconSize: [width, height],
        iconAnchor: [width / 2, height / 2],
        popupAnchor: [0, -height / 2],
      }),
    )
  }
  return buildingIcons.get(key)
}

const eventIcons = new Map()

function eventIcon(count) {
  const key = String(count)
  if (!eventIcons.has(key)) {
    eventIcons.set(
      key,
      L.divIcon({
        className: 'event-pin',
        html: `<span>${count}</span>`,
        iconSize: [28, 28],
        iconAnchor: [14, 42],
        popupAnchor: [0, -42],
      }),
    )
  }
  return eventIcons.get(key)
}

function CloseEventPopups({ spots }) {
  const map = useMap()
  useEffect(() => {
    if (spots.length === 0) map.closePopup()
  }, [map, spots])
  return null
}

function EventMarkers({ spots, onOpenEvent }) {
  return spots.map(({ building, events }) => (
    <Marker
      key={`event-${building.id}`}
      position={[building.Location.lat, building.Location.lng]}
      icon={eventIcon(events.length)}
      zIndexOffset={900}
      title={`${events.length} event${events.length === 1 ? '' : 's'} at ${building.name}`}
    >
      <Popup>
        <p className="text-[13px] font-semibold text-muted">{building.name}</p>
        <ul className="mt-2 flex max-h-48 flex-col gap-2 overflow-y-auto">
          {events.map((event) => (
            <li key={event.id}>
              <button
                type="button"
                onClick={() => onOpenEvent?.(event.id)}
                className="text-left"
              >
                <span className="block text-[15px] font-bold leading-[1.4] text-ink">{event.title}</span>
                <span className="block text-[13px] leading-[1.4] text-muted">{event.when}</span>
              </button>
            </li>
          ))}
        </ul>
      </Popup>
    </Marker>
  ))
}

function BuildingMarkers({ buildings, selectedId, highlightIds, onSelect }) {
  const highlights = highlightIds ?? (selectedId != null ? [selectedId] : null)
  return buildings.filter(hasLocation).map((b) => {
    const state = highlights == null ? 'normal' : highlights.includes(b.id) ? 'selected' : 'dimmed'
    const label = mapLabel(b)
    return (
      <Marker
        key={b.id}
        position={[b.Location.lat, b.Location.lng]}
        icon={buildingIcon(b.id, state, label)}
        zIndexOffset={state === 'selected' ? 1000 : 0}
        title={`${label}. ${b.name}`}
        eventHandlers={{ click: () => onSelect?.(b.id) }}
      >
        <Popup>
          <p className="text-[15px] font-bold leading-[1.5] text-ink">
            {label}. {b.name}
          </p>
          {b.Alias.length > 0 && (
            <p className="mt-1 text-[13px] text-muted leading-[1.5]">{b.Alias.join(' · ')}</p>
          )}
        </Popup>
      </Marker>
    )
  })
}

// Pixel room around a route so the line and pins sit clear of the search chip,
// the zoom controls, and the parking card. Capped so a short phone map still
// has space left for the path itself.
function routeFrame(map, bottomInset) {
  const size = map.getSize()
  const short = size.y < 640
  const pin = 24
  const top = Math.min((short ? 72 : 64) + pin, size.y * 0.3)
  let bottom = (bottomInset > 0 ? bottomInset : short ? 72 : 56) + pin
  bottom = Math.min(bottom, size.y * 0.5)
  // Keep the search chip and parking card clear. Only give up comfort padding
  // once the path itself would have too little of the screen left.
  const minRoute = Math.max(96, size.y * 0.32)
  if (top + bottom > size.y - minRoute) {
    bottom = Math.max(bottomInset, bottom - (top + bottom - (size.y - minRoute)))
  }
  return {
    paddingTopLeft: [Math.min(short ? 36 : 48, size.x * 0.12), Math.round(top)],
    paddingBottomRight: [Math.min(short ? 64 : 72, size.x * 0.18), Math.round(Math.max(bottom, 0))],
    maxZoom: short ? 16 : 17,
    animate: true,
  }
}

function routeIsFramed(map, route, frame) {
  const size = map.getSize()
  if (size.x < 40 || size.y < 40) return false
  const [left, top] = frame.paddingTopLeft
  const [right, bottom] = frame.paddingBottomRight
  if (left + right >= size.x || top + bottom >= size.y) return false
  const northWest = map.containerPointToLatLng([left, top])
  const southEast = map.containerPointToLatLng([size.x - right, size.y - bottom])
  return L.latLngBounds(northWest, southEast).contains(L.latLngBounds(route))
}

function FlyToBuilding({ buildings, selectedId, route, bottomInset, bounds }) {
  const map = useMap()
  const framed = useRef('')

  useEffect(() => {
    function fit(force) {
      if (!route || route.length < 2) return
      map.invalidateSize({ pan: false, animate: false })
      const size = map.getSize()
      if (size.x < 40 || size.y < 40) return
      const end = route[route.length - 1]
      const key = `${end[0].toFixed(5)},${end[1].toFixed(5)}|${Math.round(size.x)}x${Math.round(size.y)}|${bottomInset}`
      const frame = routeFrame(map, bottomInset)
      const routeBounds = L.latLngBounds(route)
      // Campus min zoom and max bounds are what keep an empty map filled with
      // campus. Both stop a padded route from fitting on a short phone map.
      map.setMaxBounds(null)
      map.setMinZoom(12)
      const campusMin = map.getBoundsZoom(L.latLngBounds(bounds), true)
      map.setMinZoom(Math.max(12, campusMin - 3))
      // A new destination or a resized phone map always reframes. Later location
      // ticks only reframe once the path would leave the padded screen.
      if (!force && framed.current === key && routeIsFramed(map, route, frame)) return
      map.fitBounds(routeBounds, frame)
      framed.current = key
    }

    if (route?.length > 1) {
      fit(false)
      map.on('resize', fit)
      return () => map.off('resize', fit)
    }

    framed.current = ''
    const b = selectedId != null ? getBuildingById(buildings, selectedId) : null
    if (b && hasLocation(b)) map.flyTo([b.Location.lat, b.Location.lng], Math.max(map.getZoom(), 17))
    return undefined
  }, [map, buildings, selectedId, route, bottomInset, bounds])
  return null
}

// Stops zooming out past the point where the campus bounds no longer fill the screen.
// While a route is on screen the fit is allowed to zoom out a step further so the
// whole path stays visible on a short phone map.
function LimitZoomToCampus({ routeActive, bounds }) {
  const map = useMap()
  useEffect(() => {
    const campus = L.latLngBounds(bounds)
    const update = () => {
      if (routeActive) return
      map.setMaxBounds(bounds)
      map.setMinZoom(map.getBoundsZoom(campus, true))
      map.panInsideBounds(campus, { animate: false })
    }
    update()
    map.on('resize', update)
    return () => map.off('resize', update)
  }, [map, routeActive, bounds])
  return null
}

function FollowUser({ position, follow, onUserPan, routeActive }) {
  const map = useMap()
  useEffect(() => {
    if (follow && position && !routeActive) map.panTo(position)
  }, [map, position, follow, routeActive])
  useEffect(() => {
    map.on('dragstart', onUserPan)
    return () => map.off('dragstart', onUserPan)
  }, [map, onUserPan])
  return null
}

function FitMap({ full }) {
  const map = useMap()
  useEffect(() => {
    map.invalidateSize({ pan: false, animate: false })
  }, [map, full])
  // The map row shrinks once featured events load, without a window resize.
  // Leaflet would keep fitting the route to the old taller size and clip the end.
  useEffect(() => {
    const container = map.getContainer()
    const observer = new ResizeObserver(() => {
      map.invalidateSize({ pan: false, animate: false })
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [map])
  return null
}

function MapControls({ onLocate }) {
  const map = useMap()
  const ref = useRef(null)

  // Without this, taps on the buttons also reach the map and trigger double-tap zoom.
  useEffect(() => {
    L.DomEvent.disableClickPropagation(ref.current)
    L.DomEvent.disableScrollPropagation(ref.current)
  }, [])

  return (
    <div ref={ref} className="absolute right-4 bottom-4 z-[1000] flex flex-col gap-2">
      <button
        type="button"
        onPointerUp={() => map.zoomIn()}
        aria-label="Zoom in"
        className="w-10 h-10 bg-white border border-line rounded-lg font-bold text-[14px] text-ink shadow-card"
      >
        +
      </button>
      <button
        type="button"
        onPointerUp={() => map.zoomOut()}
        aria-label="Zoom out"
        className="w-10 h-10 bg-white border border-line rounded-lg font-bold text-[14px] text-ink shadow-card"
      >
        −
      </button>
      <button
        type="button"
        onPointerUp={onLocate}
        aria-label="Locate me"
        className="w-10 h-10 bg-nku hover:bg-nkuDeep rounded-lg shadow-card flex items-center justify-center"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="1.8">
          <circle cx="12" cy="12" r="6.5" />
          <circle cx="12" cy="12" r="1.6" fill="#111827" />
          <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  )
}

export default function CampusMap({
  buildings,
  position,
  accuracy,
  heading,
  follow,
  onUserPan,
  onLocate,
  selectedId,
  onSelect,
  full,
  route,
  highlightIds,
  bottomInset = 0,
  eventSpots = [],
  onOpenEvent,
  center = NKU_CENTER,
  bounds = NKU_BOUNDS,
}) {
  return (
    <MapContainer
      key={JSON.stringify([center, bounds])}
      center={center}
      zoom={16}
      maxZoom={19}
      maxBounds={bounds}
      maxBoundsViscosity={1}
      zoomControl={false}
      attributionControl={false}
      className="campus-map h-full w-full"
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        maxZoom={19}
      />
      <AttributionControl position="bottomleft" prefix={false} />
      <FitMap full={full} />
      <LimitZoomToCampus routeActive={route?.length > 1} bounds={bounds} />
      <BuildingMarkers buildings={buildings} selectedId={selectedId} highlightIds={highlightIds} onSelect={onSelect} />
      <CloseEventPopups spots={eventSpots} />
      <EventMarkers spots={eventSpots} onOpenEvent={onOpenEvent} />
      <FlyToBuilding buildings={buildings} selectedId={selectedId} route={route} bottomInset={bottomInset} bounds={bounds} />
      {route?.length > 1 && (
        <Polyline
          positions={route}
          pathOptions={{ color: USER_BLUE, weight: 5, opacity: 0.92, lineJoin: 'round', lineCap: 'round' }}
        />
      )}
      {position && accuracy && (
        <Circle
          center={position}
          radius={accuracy}
          pathOptions={{ color: USER_BLUE, weight: 1, fillOpacity: 0.12 }}
          interactive={false}
        />
      )}
      {position && <UserArrow position={position} heading={heading} />}
      <FollowUser position={position} follow={follow} onUserPan={onUserPan} routeActive={route?.length > 1} />
      <MapControls onLocate={onLocate} />
    </MapContainer>
  )
}
