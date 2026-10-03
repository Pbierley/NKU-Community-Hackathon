import { useState } from 'react'
import InterestsEditor from './InterestsEditor'

function initials(name) {
  return (
    String(name ?? '')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join('') || 'NK'
  )
}

function interestsFromUser(user) {
  const names = Array.isArray(user?.interests) && user.interests.length > 0
    ? user.interests
    : ['Tech']
  return names.map((name) => ({ name: String(name), on: true }))
}

export default function AccountScreen({ onNavigate, user, onLogout, onUpdateProfile }) {
  const [name, setName] = useState(user?.name ?? '')
  const [year, setYear] = useState(user?.year || 'Junior')
  const [major, setMajor] = useState(user?.major ?? '')
  const [interests, setInterests] = useState(() => interestsFromUser(user))
  const [error, setError] = useState(null)
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)

  function markEdited() {
    setSaved(false)
  }

  function toggleInterest(idx) {
    markEdited()
    setInterests((current) => current.map((item, i) => (i === idx ? { ...item, on: !item.on } : item)))
  }

  function addInterest(label) {
    if (!label) return
    markEdited()
    if (interests.some((i) => i.name.toLowerCase() === label.toLowerCase())) return
    setInterests((current) => [...current, { name: label, on: true, custom: true }])
  }

  function removeInterest(idx) {
    markEdited()
    setInterests((current) => current.filter((_, i) => i !== idx))
  }

  async function handleSave() {
    setError(null)
    setSaved(false)
    if (!name.trim()) {
      setError('Name is required.')
      return
    }
    setBusy(true)
    try {
      await onUpdateProfile({
        name: name.trim(),
        year,
        major: major.trim(),
        interests: interests.filter((i) => i.on).map((i) => i.name),
      })
      setSaved(true)
    } catch (err) {
      setError(err.message || 'Could not save account.')
    } finally {
      setBusy(false)
    }
  }

  const email = user?.email ?? ''

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
          <h1 className="text-xl font-bold tracking-tight leading-[1.3]">Account</h1>
        </div>
        <span className="text-[12px] font-semibold text-body bg-wash border border-line rounded-md px-3 py-2">
          Profile
        </span>
      </header>

      <main className="flex-1 min-h-0 overflow-y-auto no-scrollbar p-4 sm:p-6 pb-8 space-y-6 text-left flex flex-col items-center">
        {error && (
          <p role="alert" className="w-full max-w-2xl bg-[#FEF2F2] border border-[#FECACA] rounded-lg px-4 py-4 text-[14px] font-semibold text-[#B91C1C] leading-[1.5]">
            {error}
          </p>
        )}
        {saved && (
          <p role="status" className="w-full max-w-2xl bg-[#ECFDF5] border border-[#A7F3D0] rounded-lg px-4 py-4 text-[14px] font-semibold text-[#047857] leading-[1.5]">
            Profile saved ✓
          </p>
        )}

        <section className="w-full max-w-2xl bg-white border border-line rounded-xl p-6 shadow-card" aria-label="Account details">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-ink text-white font-bold text-[16px] flex items-center justify-center shrink-0">
              {initials(name || user?.name)}
            </div>
            <div className="min-w-0 text-left">
              <h2 className="text-xl font-bold tracking-tight leading-[1.3] break-words">{name || user?.name}</h2>
              <p className="text-[13px] text-muted leading-[1.5] break-all">{email}</p>
              <span className="inline-block mt-2 text-[12px] font-semibold bg-ink text-white rounded-md px-3 py-2">
                {year || '—'}
              </span>
            </div>
          </div>

          <div className="mt-4 grid gap-2">
            <label className="flex items-center justify-between gap-4 min-h-14 bg-white border border-line rounded-lg px-4 py-2">
              <span className="text-[11px] font-bold tracking-[0.06em] uppercase text-body shrink-0">Name:</span>
              <input
                value={name}
                onChange={(e) => { setName(e.target.value); markEdited() }}
                required
                autoComplete="name"
                placeholder="Name"
                aria-label="Full name"
                className="text-right text-[15px] font-medium leading-[1.6] text-ink w-2/3 bg-transparent placeholder:text-faint"
              />
            </label>
            <div className="flex items-center justify-between gap-4 min-h-14 bg-wash border border-line rounded-lg px-4 py-2">
              <span className="text-[11px] font-bold tracking-[0.06em] uppercase text-body shrink-0">Email:</span>
              <span className="text-right text-[15px] font-medium leading-[1.6] text-muted w-2/3 break-all">{email}</span>
            </div>
          </div>
        </section>

        <section className="w-full max-w-2xl bg-white border border-nku rounded-xl p-6 shadow-card" aria-label="Year, major and interests">
          <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight leading-[1.3]">
            <span className="w-8 h-8 rounded-full bg-nku text-ink text-[13px] font-bold flex items-center justify-center tnum shrink-0">
              ✎
            </span>
            Year, Major &amp; Interests
          </h2>
          <div className="mt-4 grid gap-2">
            <label className="flex items-center justify-between gap-4 h-14 border border-line rounded-lg px-4 bg-white">
              <span className="text-[11px] font-bold tracking-[0.06em] uppercase text-body">Year:</span>
              <select
                value={year}
                onChange={(e) => { setYear(e.target.value); markEdited() }}
                className="text-[15px] font-medium bg-transparent text-right text-ink"
              >
                <option>Freshman</option>
                <option>Sophomore</option>
                <option>Junior</option>
                <option>Senior</option>
                <option>Graduate</option>
              </select>
            </label>
            <div className="flex items-center justify-between gap-4 h-14 border border-line rounded-lg px-4 bg-white">
              <label htmlFor="account-major" className="text-[11px] font-bold tracking-[0.06em] uppercase text-body">
                Major:
              </label>
              <input
                id="account-major"
                type="text"
                value={major}
                onChange={(e) => { setMajor(e.target.value); markEdited() }}
                placeholder="e.g. Cybersecurity"
                className="text-[15px] font-medium bg-transparent text-right w-2/3 text-ink placeholder:text-faint"
              />
            </div>
            <InterestsEditor
              interests={interests}
              onToggle={toggleInterest}
              onAdd={addInterest}
              onRemove={removeInterest}
            />
          </div>
        </section>
      </main>

      <footer className="shrink-0 bg-white border-t border-line p-4 sm:p-6 text-left">
        <div className="w-full max-w-2xl mx-auto space-y-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={busy}
            className="w-full h-14 px-8 rounded-lg bg-nku hover:bg-nkuDeep font-bold text-[15px] text-ink shadow-card active:scale-[0.99] transition disabled:opacity-60"
          >
            {busy ? 'SAVING…' : 'SAVE CHANGES'}
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="w-full h-14 px-8 rounded-lg bg-[#FEF2F2] text-[#B91C1C] border border-[#FECACA] font-semibold text-[15px]"
          >
            Sign Out
          </button>
        </div>
      </footer>
    </div>
  )
}
