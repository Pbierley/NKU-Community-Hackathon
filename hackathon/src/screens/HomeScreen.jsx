import { useCallback, useEffect, useMemo, useState } from 'react'
import AppHeader from '../components/AppHeader'
import FeaturedEvents from '../components/FeaturedEvents'
import Toast from '../components/Toast'
import { eventDayKey, eventWhen, useEvents } from '../Communication/useEvents'
import BuildingSearch from '../Navigation/BuildingSearch'
import CampusMap from '../Navigation/CampusMap'
import ParkingFullness from '../Navigation/ParkingFullness'
import { findBuildingForLocation, getBuildingById, hasLocation, isParkingPlace, useBuildings } from '../Navigation/buildings'
import { useParkingFullness } from '../Navigation/useParkingFullness'
import { useUserLocation } from '../Navigation/useUserLocation'
import { useWalkingRoute } from '../Navigation/useWalkingRoute'

function todayKey() {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

function eventsOnMapToday(events, buildings) {
  const today = todayKey()
  const groups = new Map()
  for (const event of events) {
    if (eventDayKey(event) !== today) continue
    const building = findBuildingForLocation(buildings, event.location)
    if (!building) continue
    const group = groups.get(building.id) ?? { building, events: [] }
    group.events.push({ id: event.id, title: event.title, when: eventWhen(event) })
    groups.set(building.id, group)
  }
  return [...groups.values()]
}

export default function HomeScreen({ onNavigate, user, focusBuildingId, onMapFocusHandled, onOpenEvent }) {
  const { buildings, error: buildingsError } = useBuildings()
  const { events } = useEvents()
  const { summary, rate } = useParkingFullness()
  const { position, accuracy, heading, error: locationError, compassEnabled, enableCompass } =
    useUserLocation()
  const [follow, setFollow] = useState(focusBuildingId == null)
  const [selectedId, setSelectedId] = useState(focusBuildingId ?? null)
  const [notice, setNotice] = useState(null)
  const [dismissedError, setDismissedError] = useState(null)
  const [mapFull, setMapFull] = useState(false)
  const [showTodayEvents, setShowTodayEvents] = useState(false)
  const todaySpots = useMemo(() => eventsOnMapToday(events, buildings), [events, buildings])
  const destination = selectedId != null ? getBuildingById(buildings, selectedId) : null
  const destPoint =
    destination && hasLocation(destination) ? [destination.Location.lat, destination.Location.lng] : null
  const { route, error: routeError } = useWalkingRoute(position, destPoint)

  const error = buildingsError ?? locationError ?? routeError
  const toast = notice ?? (error && error !== dismissedError ? error : null)
  const dismissToast = useCallback(() => {
    if (notice) setNotice(null)
    else setDismissedError(error)
  }, [notice, error])
  const stopFollowing = useCallback(() => setFollow(false), [])
  const toggleMapFull = useCallback(() => setMapFull((v) => !v), [])

  useEffect(() => {
    if (focusBuildingId == null) return
    setSelectedId(focusBuildingId)
    setFollow(false)
    onMapFocusHandled?.()
  }, [focusBuildingId, onMapFocusHandled])

  useEffect(() => {
    if (!mapFull) return
    const onKeyDown = (e) => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      setMapFull(false)
    }
    document.addEventListener('keydown', onKeyDown, true)
    return () => document.removeEventListener('keydown', onKeyDown, true)
  }, [mapFull])

  function locate() {
    // iOS only grants compass access from a tap, so the locate button doubles as the opt-in.
    if (!compassEnabled) enableCompass()
    setFollow(true)
    if (!position) setNotice('Finding your location…')
  }

  return (
    <div
      className={`screen h-full w-full max-w-full bg-canvas ${
        mapFull
          ? 'grid grid-cols-[minmax(0,1fr)] grid-rows-1'
          : 'grid grid-cols-[minmax(0,1fr)] grid-rows-[auto_minmax(0,1fr)_auto]'
      }`}
    >
      {!mapFull && <AppHeader onNavigate={onNavigate} />}

      <main
        className={`relative isolate min-h-0 min-w-0 max-w-full overflow-hidden text-left ${
          mapFull ? '' : 'mx-4 mt-4 rounded-xl border border-line'
        }`}
      >
        <CampusMap
          buildings={buildings}
          position={position}
          accuracy={accuracy}
          heading={heading}
          follow={follow}
          onUserPan={stopFollowing}
          onLocate={locate}
          selectedId={selectedId}
          onSelect={(id) => {
            setSelectedId(id)
            setFollow(false)
          }}
          full={mapFull}
          route={route}
          bottomInset={destination && isParkingPlace(destination) ? 176 : 0}
          eventSpots={showTodayEvents ? todaySpots : []}
          onOpenEvent={onOpenEvent}
        />
        <button
          type="button"
          onClick={() => setShowTodayEvents((on) => !on)}
          aria-pressed={showTodayEvents}
          aria-label={showTodayEvents ? "Hide today's events" : "Show today's events"}
          className={`absolute right-16 bottom-40 z-[1000] w-10 h-10 rounded-lg border shadow-card flex items-center justify-center ${
            showTodayEvents ? 'bg-nku border-ink text-ink' : 'bg-white border-line text-ink'
          }`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
            <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
            <path d="M3.5 9.5h17M8 3.5v3M16 3.5v3" />
          </svg>
          {todaySpots.length > 0 && (
            <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-ink text-white text-[11px] leading-5 text-center tnum">
              {todaySpots.reduce((sum, spot) => sum + spot.events.length, 0)}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={toggleMapFull}
          aria-label={mapFull ? 'Exit full screen' : 'Full screen map'}
          className="absolute right-4 bottom-40 z-[1000] w-10 h-10 bg-white border border-line rounded-lg shadow-card flex items-center justify-center text-ink"
        >
          {mapFull ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M9 3v6H3M15 3v6h6M9 21v-6H3M15 21v-6h6" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M3 9V3h6M21 9V3h-6M3 15v6h6M21 15v6h-6" />
            </svg>
          )}
        </button>
        <BuildingSearch
          buildings={buildings}
          selectedId={selectedId}
          onSelect={(id) => {
            setSelectedId(id)
            setFollow(false)
          }}
          onClear={() => setSelectedId(null)}
        />
        {destination && isParkingPlace(destination) && (
          <ParkingFullness
            place={destination}
            user={user}
            summary={summary}
            onRate={(rating) => rate(destination.id, rating)}
            onSignIn={() => onNavigate('login')}
          />
        )}
      </main>

      {!mapFull && <FeaturedEvents onNavigate={onNavigate} />}

      <Toast message={toast} onDone={dismissToast} duration={notice ? 1800 : 4000} />
    </div>
  )
}
