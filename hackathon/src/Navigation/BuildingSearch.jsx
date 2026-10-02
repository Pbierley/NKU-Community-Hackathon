import { useId, useMemo, useState } from 'react'
import { buildingCode, getBuildingById, searchBuildings } from './buildings'

export default function BuildingSearch({ selectedId, onSelect, onClear }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const listId = useId()

  const selected = selectedId != null ? getBuildingById(selectedId) : null
  const results = useMemo(() => searchBuildings(query), [query])

  function choose(building) {
    if (!building.Location) return
    onSelect(building.id)
    setQuery('')
    setOpen(false)
  }

  function clear() {
    setQuery('')
    setActive(0)
    onClear()
  }

  function onKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setActive((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && results[active]) {
      e.preventDefault()
      choose(results[active])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  if (selected) {
    return (
      <div className="building-search">
        <div className="building-search__box building-search__box--selected">
          <span className="building-search__badge">{selected.id}</span>
          <span className="building-search__selected-name">{selected.name}</span>
          <button
            type="button"
            className="building-search__clear"
            onClick={clear}
            aria-label="Clear selected building"
          >
            ×
          </button>
        </div>
      </div>
    )
  }

  const showList = open && query.trim() !== ''

  return (
    <div className="building-search">
      <div className="building-search__box">
        <input
          type="search"
          className="building-search__input"
          placeholder="Search buildings by name or code (e.g. GH)"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setActive(0)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={onKeyDown}
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
        />
        {query && (
          <button
            type="button"
            className="building-search__clear"
            onMouseDown={(e) => e.preventDefault()}
            onClick={clear}
            aria-label="Clear search"
          >
            ×
          </button>
        )}
      </div>

      {showList && (
        <ul className="building-search__results" id={listId} role="listbox">
          {results.length === 0 && <li className="building-search__empty">No buildings found</li>}
          {results.map((b, i) => {
            const code = buildingCode(b)
            const disabled = !b.Location
            return (
              <li
                key={b.id}
                role="option"
                aria-selected={i === active}
                aria-disabled={disabled}
                className={[
                  'building-search__result',
                  i === active && 'building-search__result--active',
                  disabled && 'building-search__result--disabled',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(b)}
              >
                <span className="building-search__badge">{b.id}</span>
                <span className="building-search__name">{b.name}</span>
                {disabled ? (
                  <span className="building-search__code">No location yet</span>
                ) : (
                  code && <span className="building-search__code">{code}</span>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
