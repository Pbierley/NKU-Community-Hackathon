import { useCallback, useState } from 'react'
import AppHeader from '../components/AppHeader'
import FeaturedEvents from '../components/FeaturedEvents'
import Toast from '../components/Toast'
import BuildingSearch from '../Navigation/BuildingSearch'
import { useBuildings } from '../Navigation/buildings'
import CampusMap from '../Navigation/CampusMap'
import { useUserLocation } from '../Navigation/useUserLocation'

export default function HomeScreen({ onNavigate }) {
  const { buildings, error: buildingsError } = useBuildings()
  const { position, accuracy, heading, error: locationError, compassEnabled, enableCompass } =
    useUserLocation()
  const [follow, setFollow] = useState(true)
  const [selectedId, setSelectedId] = useState(null)
  const [notice, setNotice] = useState(null)
  const [dismissedError, setDismissedError] = useState(null)

  const error = buildingsError ?? locationError
  const toast = notice ?? (error && error !== dismissedError ? error : null)
  const dismissToast = useCallback(() => {
    if (notice) setNotice(null)
    else setDismissedError(error)
  }, [notice, error])
  const stopFollowing = useCallback(() => setFollow(false), [])

  function locate() {
    // iOS only grants compass access from a tap, so the locate button doubles as the opt-in.
    if (!compassEnabled) enableCompass()
    setFollow(true)
    if (!position) setNotice('Finding your location…')
  }

  return (
    <div className="screen h-full flex flex-col bg-canvas">
      <AppHeader onNavigate={onNavigate} />

      <main className="relative isolate flex-1 min-h-0 mx-4 my-4 rounded-xl border border-line overflow-hidden text-left">
        <CampusMap
          buildings={buildings}
          position={position}
          accuracy={accuracy}
          heading={heading}
          follow={follow}
          onUserPan={stopFollowing}
          onLocate={locate}
          selectedId={selectedId}
        />
        <BuildingSearch
          buildings={buildings}
          selectedId={selectedId}
          onSelect={(id) => {
            setSelectedId(id)
            setFollow(false)
          }}
          onClear={() => setSelectedId(null)}
        />
      </main>

      <FeaturedEvents onNavigate={onNavigate} />

      <Toast message={toast} onDone={dismissToast} duration={notice ? 1800 : 4000} />
    </div>
  )
}
