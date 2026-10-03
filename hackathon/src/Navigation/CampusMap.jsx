import { useEffect, useRef } from 'react'
import {
  AttributionControl,
  Circle,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from 'react-leaflet'
import L from './leaflet'
import { getBuildingById, hasLocation } from './buildings'
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

function buildingIcon(id, state) {
  const key = `${id}-${state}`
  if (!buildingIcons.has(key)) {
    const size = PIN_SIZES[state]
    buildingIcons.set(
      key,
      L.divIcon({
        className: `building-pin building-pin--${state}`,
        html: state === 'dimmed' ? '' : `<span>${id}</span>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
        popupAnchor: [0, -size / 2],
      }),
    )
  }
  return buildingIcons.get(key)
}

function BuildingMarkers({ buildings, selectedId }) {
  return buildings.filter(hasLocation).map((b) => {
    const state = selectedId == null ? 'normal' : b.id === selectedId ? 'selected' : 'dimmed'
    return (
      <Marker
        key={b.id}
        position={[b.Location.lat, b.Location.lng]}
        icon={buildingIcon(b.id, state)}
        zIndexOffset={state === 'selected' ? 1000 : 0}
        title={`${b.id}. ${b.name}`}
      >
        <Popup>
          <p className="text-[15px] font-bold leading-[1.5] text-ink">
            {b.id}. {b.name}
          </p>
          {b.Alias.length > 0 && (
            <p className="mt-1 text-[13px] text-muted leading-[1.5]">{b.Alias.join(' · ')}</p>
          )}
        </Popup>
      </Marker>
    )
  })
}

function FlyToBuilding({ buildings, selectedId }) {
  const map = useMap()
  useEffect(() => {
    const b = selectedId != null ? getBuildingById(buildings, selectedId) : null
    if (b && hasLocation(b)) map.flyTo([b.Location.lat, b.Location.lng], Math.max(map.getZoom(), 18))
  }, [map, buildings, selectedId])
  return null
}

// Stops zooming out past the point where the campus bounds no longer fill the screen.
function LimitZoomToCampus() {
  const map = useMap()
  useEffect(() => {
    const bounds = L.latLngBounds(NKU_BOUNDS)
    const update = () => {
      map.setMinZoom(map.getBoundsZoom(bounds, true))
      map.panInsideBounds(bounds, { animate: false })
    }
    update()
    map.on('resize', update)
    return () => map.off('resize', update)
  }, [map])
  return null
}

function FollowUser({ position, follow, onUserPan }) {
  const map = useMap()
  useEffect(() => {
    if (follow && position) map.panTo(position)
  }, [map, position, follow])
  useEffect(() => {
    map.on('dragstart', onUserPan)
    return () => map.off('dragstart', onUserPan)
  }, [map, onUserPan])
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
        onClick={() => map.zoomIn()}
        aria-label="Zoom in"
        className="w-12 h-12 bg-white border border-line rounded-lg font-bold text-[16px] text-ink shadow-card"
      >
        +
      </button>
      <button
        type="button"
        onClick={() => map.zoomOut()}
        aria-label="Zoom out"
        className="w-12 h-12 bg-white border border-line rounded-lg font-bold text-[16px] text-ink shadow-card"
      >
        −
      </button>
      <button
        type="button"
        onClick={onLocate}
        aria-label="Locate me"
        className="w-12 h-12 bg-nku hover:bg-nkuDeep rounded-lg shadow-card flex items-center justify-center"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="1.8">
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
}) {
  return (
    <MapContainer
      center={NKU_CENTER}
      zoom={16}
      maxZoom={19}
      maxBounds={NKU_BOUNDS}
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
      <LimitZoomToCampus />
      <BuildingMarkers buildings={buildings} selectedId={selectedId} />
      <FlyToBuilding buildings={buildings} selectedId={selectedId} />
      {position && accuracy && (
        <Circle
          center={position}
          radius={accuracy}
          pathOptions={{ color: USER_BLUE, weight: 1, fillOpacity: 0.12 }}
          interactive={false}
        />
      )}
      {position && <UserArrow position={position} heading={heading} />}
      <FollowUser position={position} follow={follow} onUserPan={onUserPan} />
      <MapControls onLocate={onLocate} />
    </MapContainer>
  )
}
