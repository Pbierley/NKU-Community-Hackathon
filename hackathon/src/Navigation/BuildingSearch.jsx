import { useId, useMemo, useState } from 'react'
import { buildingCode, getBuildingById, hasLocation, searchBuildings } from './buildings'

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="1.8" strokeLinecap="round" className="shrink-0">
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </svg>
  )
}

function ClearButton({ label, onClick }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      aria-label={label}
      className="shrink-0 w-8 h-8 rounded-md text-muted hover:bg-wash flex items-center justify-center"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <path d="M6 6l12 12M18 6 6 18" />
      </svg>
    </button>
  )
}

const BOX =
  'flex items-center gap-2 bg-white border border-line rounded-lg pl-4 pr-2 h-12 shadow-card'

export default function BuildingSearch({ buildings, selectedId, onSelect, onClear }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const listId = useId()

  const selected = selectedId != null ? getBuildingById(buildings, selectedId) : null
  const results = useMemo(() => searchBuildings(buildings, query), [buildings, query])

  function choose(building) {
    if (!building || !hasLocation(building)) return
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
      <div className="absolute top-4 inset-x-4 z-[1000] md:right-auto md:w-[min(28rem,calc(100%-2rem))]">
        <div className={BOX}>
          <span className="shrink-0 text-[12px] font-bold bg-nku text-ink rounded-md px-2 py-1 tnum">
            {selected.id}
          </span>
          <span className="flex-1 min-w-0 truncate text-[15px] font-semibold leading-[1.6] text-ink">
            {selected.name}
          </span>
          <ClearButton label="Clear selected building" onClick={clear} />
        </div>
      </div>
    )
  }

  const showList = open && query.trim() !== ''

  return (
    <div className="absolute top-4 inset-x-4 z-[1000] md:right-auto md:w-[min(28rem,calc(100%-2rem))]">
      <div className={`field ${BOX}`}>
        <SearchIcon />
        <input
          type="text"
          placeholder="Where to? Halls, lots, shuttles"
          className="bg-transparent w-full min-w-0 text-[15px] leading-[1.6] font-medium text-ink placeholder:text-faint"
          aria-label="Navigate campus"
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
        {query && <ClearButton label="Clear search" onClick={clear} />}
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => choose(results[active])}
          aria-label="Go"
          className="shrink-0 w-8 h-8 rounded-md bg-ink text-white flex items-center justify-center"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M5 12h14m0 0-5-5m5 5-5 5" />
          </svg>
        </button>
      </div>

      {showList && (
        <ul
          id={listId}
          role="listbox"
          className="mt-2 max-h-80 overflow-y-auto no-scrollbar bg-white border border-line rounded-lg p-2 shadow-card"
        >
          {results.length === 0 && (
            <li className="px-4 py-2 text-[15px] text-muted leading-[1.6]">No buildings found</li>
          )}
          {results.map((b, i) => {
            const code = buildingCode(b)
            const disabled = !hasLocation(b)
            return (
              <li
                key={b.id}
                role="option"
                aria-selected={i === active}
                aria-disabled={disabled}
                className={[
                  'flex items-center gap-4 px-4 h-12 rounded-md',
                  i === active && 'bg-canvas',
                  disabled ? 'opacity-50 cursor-default' : 'cursor-pointer',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(b)}
              >
                <span className="shrink-0 text-[12px] font-bold bg-wash text-ink rounded-md px-2 py-1 tnum">
                  {b.id}
                </span>
                <span className="flex-1 min-w-0 truncate text-[15px] font-medium leading-[1.6] text-ink">
                  {b.name}
                </span>
                {disabled ? (
                  <span className="shrink-0 text-[13px] text-muted leading-[1.5]">No location yet</span>
                ) : (
                  code && (
                    <span className="shrink-0 text-[13px] font-semibold text-muted leading-[1.5]">
                      {code}
                    </span>
                  )
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
