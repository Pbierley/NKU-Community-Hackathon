import { useEffect, useMemo, useState } from 'react'
import { apiUrl } from '../api'
import { canCustomize } from '../auth/accountTypes'
import { getAuthToken } from '../auth/useAuth'
import { COLOR_FIELDS, DEFAULT_BRANDING, logoSrc, mergeBranding } from '../branding/branding'
import { useBranding } from '../branding/useBranding.js'

function authHeaders(json = true) {
  const headers = {}
  if (json) headers['Content-Type'] = 'application/json'
  const token = getAuthToken()
  if (token) headers.Authorization = `Bearer ${token}`
  return headers
}

async function readBuildings() {
  const res = await fetch(apiUrl('/api/buildings'))
  if (!res.ok) throw new Error(`Server responded ${res.status}`)
  return res.json()
}

async function createBuilding(body) {
  const res = await fetch(apiUrl('/api/buildings'), {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`)
  return data
}

async function patchBuilding(id, body) {
  const res = await fetch(apiUrl(`/api/buildings/${id}`), {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`)
  return data
}

async function removeBuilding(id) {
  const res = await fetch(apiUrl(`/api/buildings/${id}`), {
    method: 'DELETE',
    headers: authHeaders(),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`)
  return data
}

function Status({ error, message }) {
  if (error) {
    return (
      <p role="alert" className="bg-[#FEF2F2] border border-[#FECACA] rounded-lg px-4 py-3 text-[14px] font-semibold text-[#B91C1C]">
        {error}
      </p>
    )
  }
  if (message) {
    return (
      <p role="status" className="bg-[#ECFDF5] border border-[#A7F3D0] rounded-lg px-4 py-3 text-[14px] font-semibold text-[#047857]">
        {message}
      </p>
    )
  }
  return null
}

function Field({ label, children }) {
  return (
    <label className="flex items-center justify-between gap-4 min-h-14 bg-white border border-line rounded-lg px-4 py-2">
      <span className="text-[11px] font-bold tracking-[0.06em] uppercase text-body shrink-0">{label}:</span>
      {children}
    </label>
  )
}

export default function CustomizationScreen({ onNavigate, user }) {
  const { branding, loading, updateBranding } = useBranding()
  const [draft, setDraft] = useState(() => mergeBranding(branding))
  const [syncedBranding, setSyncedBranding] = useState(branding)
  // Adjust the editable draft during render when freshly loaded branding
  // arrives, instead of syncing state inside an effect.
  if (branding !== syncedBranding) {
    setSyncedBranding(branding)
    setDraft(mergeBranding(branding))
  }
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState(null)
  const [message, setMessage] = useState(null)
  const [buildings, setBuildings] = useState([])
  const [buildingsError, setBuildingsError] = useState(null)
  const [query, setQuery] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({ name: '', alias: '', lat: '', lng: '', parking: false })
  const [newForm, setNewForm] = useState({ name: '', alias: '', lat: '', lng: '', parking: false })
  const [landmarkBusy, setLandmarkBusy] = useState(false)

  useEffect(() => {
    let live = true
    readBuildings()
      .then((rows) => {
        if (live) setBuildings(Array.isArray(rows) ? rows : [])
      })
      .catch((err) => {
        if (live) setBuildingsError(err.message || 'Could not load locations.')
      })
    return () => {
      live = false
    }
  }, [])

  async function reloadBuildings() {
    try {
      const rows = await readBuildings()
      setBuildings(Array.isArray(rows) ? rows : [])
    } catch (err) {
      setBuildingsError(err.message || 'Could not load locations.')
    }
  }

  async function save(section, patch) {
    setBusy(section)
    setError(null)
    setMessage(null)
    try {
      const next = mergeBranding(await updateBranding({ ...patch }))
      setDraft(next)
      setMessage('Saved. The change is live for everyone.')
    } catch (err) {
      setError(err.message || 'Could not save.')
    } finally {
      setBusy(null)
    }
  }

  function handleLogoFile(file) {
    setError(null)
    setMessage(null)
    if (!file) return
    if (!String(file.type).startsWith('image/')) {
      setError('Choose an image file (PNG, JPG, WebP, or SVG).')
      return
    }
    if (file.size > 2_000_000) {
      setError('That logo is too large. Use an image under 2 MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setDraft((d) => ({ ...d, logoUrl: String(reader.result ?? '') }))
      setMessage('Logo staged. Press “Save identity” to publish it.')
    }
    reader.onerror = () => setError('That logo could not be read.')
    reader.readAsDataURL(file)
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return buildings
    return buildings.filter((b) =>
      [b.name, ...(b.Alias ?? [])].join(' ').toLowerCase().includes(q),
    )
  }, [buildings, query])

  if (!canCustomize(user)) {
    return (
      <div className="screen h-full flex flex-col bg-canvas">
        <header className="px-6 pt-4 pb-4 bg-white border-b border-line flex items-center gap-4">
          <button
            type="button"
            onClick={() => onNavigate('home')}
            aria-label="Back"
            className="w-12 h-12 rounded-lg border border-line bg-white flex items-center justify-center shrink-0"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M15 5l-7 7 7 7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold tracking-tight leading-[1.3]">Customization</h1>
        </header>
        <main className="flex-1 min-h-0 overflow-y-auto no-scrollbar p-4 sm:p-6 text-left">
          <p className="bg-[#FEF2F2] border border-[#FECACA] rounded-lg px-4 py-3 text-[14px] font-semibold text-[#B91C1C]">
            Only a developer can open customization.
          </p>
        </main>
      </div>
    )
  }

  function startEdit(building) {
    setEditingId(building.id)
    setEditForm({
      name: building.name ?? '',
      alias: (building.Alias ?? []).join(', '),
      lat: String(building.Location?.lat ?? ''),
      lng: String(building.Location?.lng ?? ''),
      parking: building.parking === true,
    })
    setBuildingsError(null)
  }

  async function submitEdit(id) {
    setLandmarkBusy(true)
    setBuildingsError(null)
    try {
      const lat = Number(editForm.lat)
      const lng = Number(editForm.lng)
      if (!editForm.name.trim()) throw new Error('Enter a full name.')
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) throw new Error('Enter latitude and longitude as numbers.')
      await patchBuilding(id, { name: editForm.name.trim(), alias: editForm.alias, lat, lng, parking: editForm.parking })
      setEditingId(null)
      await reloadBuildings()
    } catch (err) {
      setBuildingsError(err.message || 'Could not update the location.')
    } finally {
      setLandmarkBusy(false)
    }
  }

  async function submitDelete(id, name) {
    if (!window.confirm(`Remove “${name}” from the campus map?`)) return
    setLandmarkBusy(true)
    setBuildingsError(null)
    try {
      await removeBuilding(id)
      if (editingId === id) setEditingId(null)
      await reloadBuildings()
    } catch (err) {
      setBuildingsError(err.message || 'Could not remove the location.')
    } finally {
      setLandmarkBusy(false)
    }
  }

  async function submitAdd(e) {
    e.preventDefault()
    setLandmarkBusy(true)
    setBuildingsError(null)
    try {
      const lat = Number(newForm.lat)
      const lng = Number(newForm.lng)
      if (!newForm.name.trim()) throw new Error('Enter a full name.')
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) throw new Error('Enter latitude and longitude as numbers.')
      await createBuilding({ name: newForm.name.trim(), alias: newForm.alias, lat, lng, parking: newForm.parking })
      setNewForm({ name: '', alias: '', lat: '', lng: '', parking: false })
      await reloadBuildings()
    } catch (err) {
      setBuildingsError(err.message || 'Could not add the location.')
    } finally {
      setLandmarkBusy(false)
    }
  }

  return (
    <div className="screen h-full flex flex-col bg-canvas">
      <header className="px-6 pt-4 pb-4 bg-white border-b border-line flex items-center gap-4">
        <button
          type="button"
          onClick={() => onNavigate('home')}
          aria-label="Back"
          className="w-12 h-12 rounded-lg border border-line bg-white flex items-center justify-center shrink-0"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </button>
        <div className="flex-1 text-left">
          <h1 className="text-xl font-bold tracking-tight leading-[1.3]">Customization</h1>
        </div>
        <span className="text-[12px] font-semibold text-body bg-wash border border-line rounded-md px-3 py-2">Developer only</span>
      </header>

      <main className="flex-1 min-h-0 overflow-y-auto no-scrollbar p-4 sm:p-6 pb-8 space-y-6 text-left flex flex-col items-center">
        <div className="w-full max-w-2xl space-y-4">
          <Status error={error} message={message} />
          {loading && <p className="text-[14px] text-muted">Loading branding…</p>}
        </div>

        <section className="w-full max-w-2xl bg-white border border-line rounded-xl p-6 shadow-card" aria-label="Identity">
          <h2 className="text-xl font-bold tracking-tight leading-[1.3]">Identity</h2>
          <p className="mt-1 text-[14px] text-muted leading-[1.5]">School name, tagline, and logo. Used on login, headers, and the browser tab.</p>
          <div className="mt-4 grid gap-2">
            <Field label="School">
              <input
                value={draft.schoolName}
                onChange={(e) => setDraft((d) => ({ ...d, schoolName: e.target.value }))}
                maxLength={120}
                aria-label="School name"
                className="text-right text-[15px] font-medium leading-[1.6] text-ink w-2/3 bg-transparent placeholder:text-faint"
              />
            </Field>
            <Field label="Tagline">
              <input
                value={draft.portalTagline}
                onChange={(e) => setDraft((d) => ({ ...d, portalTagline: e.target.value }))}
                maxLength={160}
                aria-label="Portal tagline"
                className="text-right text-[15px] font-medium leading-[1.6] text-ink w-2/3 bg-transparent placeholder:text-faint"
              />
            </Field>
            <div className="flex items-center gap-4 border border-line rounded-lg px-4 py-3 bg-white">
              <img src={logoSrc(draft)} alt="Logo preview" className="h-12 w-auto rounded-lg border border-line shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold tracking-[0.06em] uppercase text-body">Logo</p>
                <label className="mt-2 inline-flex items-center h-12 px-4 rounded-md bg-ink text-white font-bold text-[14px] cursor-pointer">
                  Upload image
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml,image/avif"
                    className="hidden"
                    onChange={(e) => handleLogoFile(e.target.files?.[0])}
                  />
                </label>
                {draft.logoUrl && (
                  <button
                    type="button"
                    onClick={() => setDraft((d) => ({ ...d, logoUrl: '' }))}
                    className="ml-2 h-12 px-4 rounded-md border border-line font-bold text-[14px] text-body"
                  >
                    Reset to default
                  </button>
                )}
                <p className="mt-2 text-[12px] text-muted leading-[1.5]">PNG, JPG, WebP, or SVG under 2 MB.</p>
              </div>
            </div>
          </div>
          <button
            type="button"
            disabled={busy != null}
            onClick={() => save('identity', { schoolName: draft.schoolName.trim(), portalTagline: draft.portalTagline.trim(), logoUrl: draft.logoUrl })}
            className="mt-4 h-12 px-6 rounded-lg bg-nku font-bold text-[14px] text-ink disabled:opacity-60"
          >
            {busy === 'identity' ? 'Saving…' : 'Save identity'}
          </button>
        </section>

        <section className="w-full max-w-2xl bg-white border border-line rounded-xl p-6 shadow-card" aria-label="Colors">
          <h2 className="text-xl font-bold tracking-tight leading-[1.3]">Colors</h2>
          <p className="mt-1 text-[14px] text-muted leading-[1.5]">Full palette. Primary re-themes buttons, pins, and highlights everywhere.</p>
          <div className="mt-4 grid gap-2">
            {COLOR_FIELDS.map((field) => (
              <div key={field.key} className="flex items-center gap-4 min-h-14 border border-line rounded-lg px-4 py-2 bg-white">
                <input
                  type="color"
                  value={draft.colors[field.key]}
                  onChange={(e) => setDraft((d) => ({ ...d, colors: { ...d.colors, [field.key]: e.target.value.toUpperCase() } }))}
                  aria-label={`${field.label} picker`}
                  className="w-10 h-10 rounded-md border border-line bg-white shrink-0"
                />
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-[15px] font-semibold leading-[1.5]">{field.label}</p>
                  <p className="text-[12px] text-muted leading-[1.5]">{field.hint}</p>
                </div>
                <input
                  value={draft.colors[field.key]}
                  onChange={(e) => setDraft((d) => ({ ...d, colors: { ...d.colors, [field.key]: e.target.value } }))}
                  maxLength={7}
                  spellCheck={false}
                  aria-label={`${field.label} hex`}
                  className="w-24 text-right text-[15px] font-medium leading-[1.6] text-ink bg-transparent tnum"
                />
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg border border-line p-4" aria-label="Theme preview">
            <button type="button" className="h-12 px-6 rounded-lg bg-nku font-bold text-[14px] text-ink">Primary action</button>
            <button type="button" className="h-12 px-6 rounded-lg bg-ink text-white font-semibold text-[14px]">Secondary</button>
            <span className="text-[12px] font-semibold bg-wash text-body border border-line rounded-md px-3 py-2">Wash chip</span>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy != null}
              onClick={() => save('colors', { colors: draft.colors })}
              className="h-12 px-6 rounded-lg bg-nku font-bold text-[14px] text-ink disabled:opacity-60"
            >
              {busy === 'colors' ? 'Saving…' : 'Save colors'}
            </button>
            <button
              type="button"
              disabled={busy != null}
              onClick={() => setDraft((d) => ({ ...d, colors: { ...DEFAULT_BRANDING.colors } }))}
              className="h-12 px-6 rounded-lg border border-line font-bold text-[14px] text-body disabled:opacity-60"
            >
              Reset to NKU gold
            </button>
          </div>
        </section>

        <section className="w-full max-w-2xl bg-white border border-line rounded-xl p-6 shadow-card" aria-label="Map location">
          <h2 className="text-xl font-bold tracking-tight leading-[1.3]">Map location</h2>
          <p className="mt-1 text-[14px] text-muted leading-[1.5]">Campus center and the bounds the map cannot be panned past. Retargets the app to another university.</p>
          <div className="mt-4 grid gap-2">
            <Field label="Center lat">
              <input
                value={draft.map.center[0]}
                onChange={(e) => setDraft((d) => ({ ...d, map: { ...d.map, center: [e.target.value, d.map.center[1]] } }))}
                inputMode="decimal"
                aria-label="Center latitude"
                className="text-right text-[15px] font-medium leading-[1.6] text-ink w-2/3 bg-transparent tnum"
              />
            </Field>
            <Field label="Center lng">
              <input
                value={draft.map.center[1]}
                onChange={(e) => setDraft((d) => ({ ...d, map: { ...d.map, center: [d.map.center[0], e.target.value] } }))}
                inputMode="decimal"
                aria-label="Center longitude"
                className="text-right text-[15px] font-medium leading-[1.6] text-ink w-2/3 bg-transparent tnum"
              />
            </Field>
            <Field label="South">
              <input
                value={draft.map.bounds[0][0]}
                onChange={(e) => setDraft((d) => ({ ...d, map: { ...d.map, bounds: [[e.target.value, d.map.bounds[0][1]], d.map.bounds[1]] } }))}
                inputMode="decimal"
                aria-label="South bound"
                className="text-right text-[15px] font-medium leading-[1.6] text-ink w-2/3 bg-transparent tnum"
              />
            </Field>
            <Field label="West">
              <input
                value={draft.map.bounds[0][1]}
                onChange={(e) => setDraft((d) => ({ ...d, map: { ...d.map, bounds: [[d.map.bounds[0][0], e.target.value], d.map.bounds[1]] } }))}
                inputMode="decimal"
                aria-label="West bound"
                className="text-right text-[15px] font-medium leading-[1.6] text-ink w-2/3 bg-transparent tnum"
              />
            </Field>
            <Field label="North">
              <input
                value={draft.map.bounds[1][0]}
                onChange={(e) => setDraft((d) => ({ ...d, map: { ...d.map, bounds: [d.map.bounds[0], [e.target.value, d.map.bounds[1][1]]] } }))}
                inputMode="decimal"
                aria-label="North bound"
                className="text-right text-[15px] font-medium leading-[1.6] text-ink w-2/3 bg-transparent tnum"
              />
            </Field>
            <Field label="East">
              <input
                value={draft.map.bounds[1][1]}
                onChange={(e) => setDraft((d) => ({ ...d, map: { ...d.map, bounds: [d.map.bounds[0], [d.map.bounds[1][0], e.target.value]] } }))}
                inputMode="decimal"
                aria-label="East bound"
                className="text-right text-[15px] font-medium leading-[1.6] text-ink w-2/3 bg-transparent tnum"
              />
            </Field>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy != null}
              onClick={() => save('map', {
                map: {
                  center: [Number(draft.map.center[0]), Number(draft.map.center[1])],
                  bounds: [
                    [Number(draft.map.bounds[0][0]), Number(draft.map.bounds[0][1])],
                    [Number(draft.map.bounds[1][0]), Number(draft.map.bounds[1][1])],
                  ],
                },
              })}
              className="h-12 px-6 rounded-lg bg-nku font-bold text-[14px] text-ink disabled:opacity-60"
            >
              {busy === 'map' ? 'Saving…' : 'Save map location'}
            </button>
            <button
              type="button"
              disabled={busy != null}
              onClick={() => setDraft((d) => ({ ...d, map: structuredClone(DEFAULT_BRANDING.map) }))}
              className="h-12 px-6 rounded-lg border border-line font-bold text-[14px] text-body disabled:opacity-60"
            >
              Reset to NKU
            </button>
          </div>
        </section>

        <section className="w-full max-w-2xl bg-white border border-line rounded-xl p-6 shadow-card" aria-label="Landmarks">
          <h2 className="text-xl font-bold tracking-tight leading-[1.3]">Landmarks</h2>
          <p className="mt-1 text-[14px] text-muted leading-[1.5]">
            Buildings and lots on the campus map ({buildings.length}). Edits apply everywhere pins, search, and event locations resolve.
          </p>
          {buildingsError && (
            <p role="alert" className="mt-4 bg-[#FEF2F2] border border-[#FECACA] rounded-lg px-4 py-3 text-[14px] font-semibold text-[#B91C1C]">
              {buildingsError}
            </p>
          )}
          <div className="mt-4 flex items-center gap-2 bg-white border border-line rounded-lg px-4 h-14">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="1.8" strokeLinecap="round">
              <circle cx="11" cy="11" r="6.5" />
              <path d="m16 16 4.5 4.5" />
            </svg>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search landmarks…"
              aria-label="Search landmarks"
              className="bg-transparent w-full text-[15px] leading-[1.6] font-medium placeholder:text-faint"
            />
          </div>
          <ul className="mt-4 grid gap-2">
            {filtered.slice(0, 60).map((b) => (
              <li key={b.id} className="border border-line rounded-lg px-4 py-3 bg-white">
                {editingId === b.id ? (
                  <div className="grid gap-2">
                    <Field label="Name">
                      <input
                        value={editForm.name}
                        onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                        maxLength={120}
                        aria-label="Landmark name"
                        className="text-right text-[15px] font-medium text-ink w-2/3 bg-transparent"
                      />
                    </Field>
                    <Field label="Aliases">
                      <input
                        value={editForm.alias}
                        onChange={(e) => setEditForm((f) => ({ ...f, alias: e.target.value }))}
                        placeholder="GH, College of Informatics"
                        aria-label="Landmark aliases"
                        className="text-right text-[15px] font-medium text-ink w-2/3 bg-transparent placeholder:text-faint"
                      />
                    </Field>
                    <div className="grid grid-cols-2 gap-2">
                      <Field label="Lat">
                        <input
                          value={editForm.lat}
                          onChange={(e) => setEditForm((f) => ({ ...f, lat: e.target.value }))}
                          inputMode="decimal"
                          aria-label="Landmark latitude"
                          className="text-right text-[15px] font-medium text-ink w-full bg-transparent tnum"
                        />
                      </Field>
                      <Field label="Lng">
                        <input
                          value={editForm.lng}
                          onChange={(e) => setEditForm((f) => ({ ...f, lng: e.target.value }))}
                          inputMode="decimal"
                          aria-label="Landmark longitude"
                          className="text-right text-[15px] font-medium text-ink w-full bg-transparent tnum"
                        />
                      </Field>
                    </div>
                    <label className="flex items-center gap-3 min-h-12 border border-line rounded-lg px-4 bg-white">
                      <input
                        type="checkbox"
                        checked={editForm.parking}
                        onChange={(e) => setEditForm((f) => ({ ...f, parking: e.target.checked }))}
                        className="w-4 h-4 accent-ink"
                      />
                      <span className="text-[15px] font-medium leading-[1.6]">Parking lot</span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={landmarkBusy}
                        onClick={() => submitEdit(b.id)}
                        className="h-12 px-6 rounded-lg bg-nku font-bold text-[14px] text-ink disabled:opacity-60"
                      >
                        {landmarkBusy ? 'Saving…' : 'Save'}
                      </button>
                      <button
                        type="button"
                        disabled={landmarkBusy}
                        onClick={() => setEditingId(null)}
                        className="h-12 px-6 rounded-lg border border-line font-bold text-[14px] text-body disabled:opacity-60"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-[15px] font-bold leading-[1.5] truncate">{b.name}</p>
                      <p className="text-[13px] text-muted leading-[1.5] tnum">
                        #{b.id}
                        {(b.Alias ?? []).length > 0 && ` · ${(b.Alias ?? []).slice(0, 3).join(', ')}`}
                        {b.Location ? ` · ${b.Location.lat}, ${b.Location.lng}` : ' · no coordinates'}
                        {b.parking === true && ' · parking'}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={landmarkBusy}
                      onClick={() => startEdit(b)}
                      className="h-11 px-4 rounded-md border border-line font-bold text-[13px] text-body shrink-0 disabled:opacity-60"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={landmarkBusy}
                      onClick={() => submitDelete(b.id, b.name)}
                      className="h-11 px-4 rounded-md bg-[#FEF2F2] text-[#B91C1C] border border-[#FECACA] font-bold text-[13px] shrink-0 disabled:opacity-60"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
          {filtered.length > 60 && (
            <p className="mt-2 text-[13px] text-muted leading-[1.5]">Showing 60 of {filtered.length}. Refine the search.</p>
          )}
          <form onSubmit={submitAdd} className="mt-4 grid gap-2 border-t border-line pt-4" aria-label="Add landmark">
            <p className="text-[11px] font-bold tracking-[0.06em] uppercase text-body">Add landmark</p>
            <Field label="Name">
              <input
                value={newForm.name}
                onChange={(e) => setNewForm((f) => ({ ...f, name: e.target.value }))}
                required
                maxLength={120}
                placeholder="Griffin Hall"
                aria-label="New landmark name"
                className="text-right text-[15px] font-medium text-ink w-2/3 bg-transparent placeholder:text-faint"
              />
            </Field>
            <Field label="Aliases">
              <input
                value={newForm.alias}
                onChange={(e) => setNewForm((f) => ({ ...f, alias: e.target.value }))}
                placeholder="GH, College of Informatics"
                aria-label="New landmark aliases"
                className="text-right text-[15px] font-medium text-ink w-2/3 bg-transparent placeholder:text-faint"
              />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Lat">
                <input
                  value={newForm.lat}
                  onChange={(e) => setNewForm((f) => ({ ...f, lat: e.target.value }))}
                  required
                  inputMode="decimal"
                  placeholder="39.031075"
                  aria-label="New landmark latitude"
                  className="text-right text-[15px] font-medium text-ink w-full bg-transparent placeholder:text-faint tnum"
                />
              </Field>
              <Field label="Lng">
                <input
                  value={newForm.lng}
                  onChange={(e) => setNewForm((f) => ({ ...f, lng: e.target.value }))}
                  required
                  inputMode="decimal"
                  placeholder="-84.461664"
                  aria-label="New landmark longitude"
                  className="text-right text-[15px] font-medium text-ink w-full bg-transparent placeholder:text-faint tnum"
                />
              </Field>
            </div>
            <label className="flex items-center gap-3 min-h-14 border border-line rounded-lg px-4 bg-white">
              <input
                type="checkbox"
                checked={newForm.parking}
                onChange={(e) => setNewForm((f) => ({ ...f, parking: e.target.checked }))}
                className="w-4 h-4 accent-ink"
              />
              <span className="text-[15px] font-medium leading-[1.6]">Parking lot</span>
            </label>
            <button
              type="submit"
              disabled={landmarkBusy}
              className="h-12 px-6 rounded-lg bg-ink text-white font-bold text-[14px] disabled:opacity-60 justify-self-start"
            >
              {landmarkBusy ? 'Saving…' : 'Add landmark'}
            </button>
          </form>
        </section>
      </main>
    </div>
  )
}
