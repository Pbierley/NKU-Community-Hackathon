import { useEffect, useRef } from 'react'
import { Circle, MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import L from './leaflet'
import { getBuildingById, MAPPED_BUILDINGS } from './buildings'
import { NKU_BOUNDS, NKU_CENTER } from './nkuMap'

const ARROW_SVG = `
  <svg viewBox="0 0 40 40" width="40" height="40" aria-hidden="true">
    <path d="M20 3 L33 35 L20 28 L7 35 Z" fill="#1a73e8" stroke="#fff" stroke-width="3" stroke-linejoin="round" />
  </svg>`

const DOT_SVG = `
  <svg viewBox="0 0 40 40" width="40" height="40" aria-hidden="true">
    <circle cx="20" cy="20" r="9" fill="#1a73e8" stroke="#fff" stroke-width="3" />
  </svg>`

function UserArrow({ position, heading }) {
  const map = useMap()
  const markerRef = useRef(null)
  const hasHeading = heading !== null

  useEffect(() => {
    const icon = L.divIcon({
      className: 'user-arrow',
      html: `<div class="user-arrow__inner">${hasHeading ? ARROW_SVG : DOT_SVG}</div>`,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
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

const PIN_SIZES = { normal: 26, selected: 40, dimmed: 10 }
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

function BuildingMarkers({ selectedId }) {
  return MAPPED_BUILDINGS.map((b) => {
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
          <strong>
            {b.id}. {b.name}
          </strong>
          {b.Alias.length > 0 && <div className="building-popup__alias">{b.Alias.join(' · ')}</div>}
        </Popup>
      </Marker>
    )
  })
}

function FlyToBuilding({ selectedId }) {
  const map = useMap()
  useEffect(() => {
    const b = selectedId != null ? getBuildingById(selectedId) : null
    if (b?.Location) map.flyTo([b.Location.lat, b.Location.lng], Math.max(map.getZoom(), 18))
  }, [map, selectedId])
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

function FollowUser({ position, follow }) {
  const map = useMap()
  useEffect(() => {
    if (follow && position) map.panTo(position)
  }, [map, position, follow])
  return null
}

export default function CampusMap({ position, accuracy, heading, follow, selectedId }) {
  return (
    <MapContainer
      center={NKU_CENTER}
      zoom={16}
      maxZoom={19}
      maxBounds={NKU_BOUNDS}
      maxBoundsViscosity={1}
      className="campus-map"
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        maxZoom={19}
      />
      <LimitZoomToCampus />
      <BuildingMarkers selectedId={selectedId} />
      <FlyToBuilding selectedId={selectedId} />
      {position && accuracy && (
        <Circle
          center={position}
          radius={accuracy}
          pathOptions={{ color: '#1a73e8', weight: 1, fillOpacity: 0.12 }}
          interactive={false}
        />
      )}
      {position && <UserArrow position={position} heading={heading} />}
      <FollowUser position={position} follow={follow} />
    </MapContainer>
  )
}
