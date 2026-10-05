import { useMemo, useState } from 'react'
import AppHeader from '../components/AppHeader'
import BuildingSearch from '../Navigation/BuildingSearch'
import CampusMap from '../Navigation/CampusMap'
import { closestParkingRoute, formatWalk } from '../Navigation/closestParking'
import { campusRoleOf } from '../auth/accountTypes'
import { getBuildingById, hasLocation, isParkingPlace, lotSuggestedFor, mapLabel, parkingPermitLabel, useBuildings } from '../Navigation/buildings'
import { useUserLocation } from '../Navigation/useUserLocation'
import { useWalkGraph } from '../Navigation/useWalkingRoute'

export default function SuggestedParkingScreen({ onNavigate, user }) {
  const { buildings, error: buildingsError } = useBuildings()
  const nodes = useWalkGraph()
  const { position, accuracy, heading, compassEnabled, enableCompass } = useUserLocation()
  const [follow, setFollow] = useState(false)
  const [selectedId, setSelectedId] = useState(null)
  const destinations = useMemo(
    () => buildings.filter((building) => !isParkingPlace(building) && hasLocation(building)),
    [buildings],
  )
  const campusRole = campusRoleOf(user?.campusRole)
  const lots = useMemo(
    () => buildings.filter((building) => isParkingPlace(building) && hasLocation(building) && lotSuggestedFor(campusRole, building)),
    [buildings, campusRole],
  )
  const destination = selectedId != null ? getBuildingById(buildings, selectedId) : null
  const suggestion = useMemo(
    () => (destination && !isParkingPlace(destination) ? closestParkingRoute(nodes, lots, destination) : null),
    [nodes, lots, destination],
  )

  function chooseBuilding(id) {
    const building = getBuildingById(buildings, id)
    if (!building || isParkingPlace(building) || !hasLocation(building)) return
    setSelectedId(id)
    setFollow(false)
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
  else if (destination && lots.length === 0) detail = 'No parking lots are on the map yet.'
  else if (destination && !suggestion) {
    detail = campusRole === 'student'
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
          bottomInset={128}
        />
        <BuildingSearch
          buildings={destinations}
          selectedId={selectedId}
          onSelect={chooseBuilding}
          onClear={() => setSelectedId(null)}
          placeholder="Which building?"
        />
        <section className="absolute bottom-4 left-4 right-16 z-[1000] bg-white border border-line rounded-lg shadow-card p-3 text-left">
          <p className="text-[13px] font-bold text-ink leading-[1.4]">
            {suggestion
              ? `Park at ${mapLabel(suggestion.lot)} · ${suggestion.lot.name}${parkingPermitLabel(suggestion.lot) ? ` · ${parkingPermitLabel(suggestion.lot)}` : ''}`
              : 'Suggested parking'}
          </p>
          <p className="mt-0.5 text-[13px] text-muted leading-[1.4]">{detail}</p>
        </section>
      </main>
    </div>
  )
}
