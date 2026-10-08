import { useMemo, useState } from 'react'
import Toast from '../components/Toast'
import AppHeader from '../components/AppHeader'
import BuildingSearch from '../Navigation/BuildingSearch'
import CampusMap from '../Navigation/CampusMap'
import { closestParkingRoute, formatWalk } from '../Navigation/closestParking'
import { campusRoleOf } from '../auth/accountTypes'
import { getBuildingById, hasLocation, isParkingPlace, isVisitorGarage, lotSuggestedFor, mapLabel, parkingPermitLabel, useBuildings } from '../Navigation/buildings'
import { useUserLocation } from '../Navigation/useUserLocation'
import { buildParkUrl, clearRouteHash, copyShareUrl, parseRouteHash } from '../Navigation/shareRoute'
import { useWalkGraph } from '../Navigation/useWalkingRoute'

export default function SuggestedParkingScreen({
  onNavigate,
  user,
  initialDestinationId = null,
  initialVisitor = false,
}) {
  const { buildings, error: buildingsError } = useBuildings()
  const nodes = useWalkGraph()
  const { position, accuracy, heading, compassEnabled, enableCompass } = useUserLocation()
  const [follow, setFollow] = useState(false)
  const [notice, setNotice] = useState(null)
  const [selectedId, setSelectedId] = useState(() => {
    if (initialDestinationId != null) return initialDestinationId
    const shared = parseRouteHash()
    return shared?.kind === 'park' ? shared.toId : null
  })
  const [pinnedLotId, setPinnedLotId] = useState(() => {
    if (initialVisitor) return null
    const shared = parseRouteHash()
    return shared?.kind === 'park' ? shared.fromId : null
  })
  const [visitor, setVisitor] = useState(initialVisitor && !user)
  const destinations = useMemo(
    () => buildings.filter((building) => !isParkingPlace(building) && hasLocation(building)),
    [buildings],
  )
  const campusRole = campusRoleOf(user?.campusRole)
  const lots = useMemo(
    () => buildings.filter((building) => isParkingPlace(building) && hasLocation(building) && lotSuggestedFor(campusRole, building)),
    [buildings, campusRole],
  )
  const choices = useMemo(
    () => (visitor ? lots.filter(isVisitorGarage) : lots),
    [lots, visitor],
  )
  const destination = selectedId != null ? getBuildingById(buildings, selectedId) : null
  const pinnedLot = pinnedLotId != null ? getBuildingById(buildings, pinnedLotId) : null
  const suggestion = useMemo(() => {
    if (!destination || isParkingPlace(destination)) return null
    const keepPinned = pinnedLot && isParkingPlace(pinnedLot) && (!visitor || isVisitorGarage(pinnedLot))
    if (keepPinned) {
      const shared = closestParkingRoute(nodes, [pinnedLot], destination)
      if (shared) return shared
    }
    return closestParkingRoute(nodes, choices, destination)
  }, [nodes, choices, destination, pinnedLot, visitor])

  function chooseBuilding(id) {
    const building = getBuildingById(buildings, id)
    if (!building || isParkingPlace(building) || !hasLocation(building)) return
    setPinnedLotId(null)
    setSelectedId(id)
    setFollow(false)
    clearRouteHash()
  }

  function chooseVisitor(next) {
    setVisitor(next)
    if (next && pinnedLot && !isVisitorGarage(pinnedLot)) {
      setPinnedLotId(null)
      clearRouteHash()
    }
  }

  function clearBuilding() {
    setPinnedLotId(null)
    setSelectedId(null)
    clearRouteHash()
  }

  async function shareRoute() {
    if (!suggestion || !destination) return
    const copied = await copyShareUrl(buildParkUrl(suggestion.lot.id, destination.id))
    setNotice(copied ? 'Link copied' : 'Could not copy the link. It is in the address bar.')
  }

  function locate() {
    if (!compassEnabled) enableCompass()
    setFollow(true)
  }

  const route = suggestion?.route ?? null
  const highlightIds = destination
    ? [destination.id, suggestion?.lot?.id].filter((id) => id != null)
    : undefined

  let detail = 'Search for the building you need. The closest lot and the walk from it will show here.'
  if (buildingsError) detail = buildingsError
  else if (destination && !nodes) detail = 'Finding the closest lot…'
  else if (destination && choices.length === 0) {
    detail = visitor ? 'No visitor garages are on the map yet.' : 'No parking lots are on the map yet.'
  }
  else if (destination && !suggestion) {
    detail = visitor
      ? 'No visitor garage has a walking path to this building.'
      : campusRole === 'student'
        ? 'No lot open to students has a walking path to this building.'
        : 'No walking path from a lot to this building.'
  }
  else if (suggestion) {
    detail = `Walk to ${destination.name}. ${formatWalk(suggestion.meters)}.`
  }

  return (
    <div className="screen h-full w-full max-w-full bg-canvas grid grid-cols-[minmax(0,1fr)] grid-rows-[auto_minmax(0,1fr)]">
      <AppHeader onNavigate={onNavigate} />
      <main className="relative isolate min-h-0 min-w-0 max-w-full overflow-hidden text-left mx-4 mt-4 mb-4 rounded-xl border border-line">
        <CampusMap
          buildings={buildings}
          position={position}
          accuracy={accuracy}
          heading={heading}
          follow={follow}
          onUserPan={() => setFollow(false)}
          onLocate={locate}
          selectedId={destination?.id ?? null}
          highlightIds={highlightIds}
          onSelect={chooseBuilding}
          route={route}
          bottomInset={!user && destination ? (suggestion ? 220 : 160) : suggestion ? 176 : 128}
        />
        <BuildingSearch
          buildings={destinations}
          selectedId={selectedId}
          onSelect={chooseBuilding}
          onClear={clearBuilding}
          placeholder="Which building?"
        />
        <section className="absolute bottom-4 left-4 right-16 z-[1000] bg-white border border-line rounded-lg shadow-card p-3 text-left">
          <p className="text-[13px] font-bold text-ink leading-[1.4]">
            {suggestion
              ? `Park at ${mapLabel(suggestion.lot)} · ${suggestion.lot.name}${parkingPermitLabel(suggestion.lot) ? ` · ${parkingPermitLabel(suggestion.lot)}` : ''}`
              : 'Suggested parking'}
          </p>
          <p className="mt-0.5 text-[13px] text-muted leading-[1.4]">{detail}</p>
          {!user && destination && (
            <label className="mt-2 flex items-center gap-2 text-[13px] font-semibold text-ink">
              <input
                type="checkbox"
                checked={visitor}
                onChange={(event) => chooseVisitor(event.target.checked)}
              />
              Visitor — park in a garage
            </label>
          )}
          {suggestion && (
            <button
              type="button"
              onClick={shareRoute}
              className="mt-2 h-8 px-3 rounded-md border border-line bg-white text-[13px] font-bold text-ink"
            >
              Share route
            </button>
          )}
        </section>
      </main>
      <Toast message={notice} onDone={() => setNotice(null)} />
    </div>
  )
}
