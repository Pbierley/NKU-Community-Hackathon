import { useCallback, useEffect, useState } from 'react'
import AppHeader from '../components/AppHeader'
import FeaturedEvents from '../components/FeaturedEvents'
import Toast from '../components/Toast'
import BuildingSearch from '../Navigation/BuildingSearch'
import CampusMap from '../Navigation/CampusMap'
import ParkingFullness from '../Navigation/ParkingFullness'
import { getBuildingById, hasLocation, isParkingPlace, useBuildings } from '../Navigation/buildings'
import { useParkingFullness } from '../Navigation/useParkingFullness'
import { useUserLocation } from '../Navigation/useUserLocation'
import { useWalkingRoute } from '../Navigation/useWalkingRoute'

export default function HomeScreen({ onNavigate, user, focusBuildingId, onMapFocusHandled }) {
  const { buildings, error: buildingsError } = useBuildings()
  const { summary, rate } = useParkingFullness()
  const { position, accuracy, heading, error: locationError, compassEnabled, enableCompass } =
    useUserLocation()
  const [follow, setFollow] = useState(focusBuildingId == null)
  const [selectedId, setSelectedId] = useState(focusBuildingId ?? null)
  const [notice, setNotice] = useState(null)
  const [dismissedError, setDismissedError] = useState(null)
  const [mapFull, setMapFull] = useState(false)
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
        />
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
