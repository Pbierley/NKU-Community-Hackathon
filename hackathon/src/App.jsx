import { useState } from 'react'
import BuildingSearch from './Navigation/BuildingSearch'
import CampusMap from './Navigation/CampusMap'
import { useUserLocation } from './Navigation/useUserLocation'
import './App.css'

function App() {
  const { position, accuracy, heading, error, compassEnabled, enableCompass } = useUserLocation()
  const [follow, setFollow] = useState(true)
  const [selectedId, setSelectedId] = useState(null)

  return (
    <div className="app">
      <CampusMap
        position={position}
        accuracy={accuracy}
        heading={heading}
        follow={follow}
        selectedId={selectedId}
      />

      <BuildingSearch
        selectedId={selectedId}
        onSelect={(id) => {
          setSelectedId(id)
          setFollow(false)
        }}
        onClear={() => setSelectedId(null)}
      />

      <div className="map-panel">
        {!compassEnabled && (
          <button type="button" onClick={enableCompass}>
            Enable compass
          </button>
        )}
        <label className="map-panel__toggle">
          <input type="checkbox" checked={follow} onChange={(e) => setFollow(e.target.checked)} />
          Follow me
        </label>
        <p className="map-panel__status">
          {error
            ? error
            : position
              ? `±${Math.round(accuracy)} m${heading !== null ? ` · facing ${Math.round(heading)}°` : ''}`
              : 'Finding your location…'}
        </p>
      </div>
    </div>
  )
}

export default App
