import { useMemo, useState } from 'react'

const INTEREST_PALETTE = [
  'bg-[#FFFBEB] text-[#92400E] border-[#FDE68A]',
  'bg-[#F5F3FF] text-[#5B21B6] border-[#DDD6FE]',
  'bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]',
  'bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]',
  'bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]',
  'bg-[#FDF4FF] text-[#A21CAF] border-[#F0ABFC]',
]

const DEFAULT_INTERESTS = [
  { name: 'Sports', on: true },
  { name: 'Arts', on: true },
  { name: 'Music', on: true },
  { name: 'Tech', on: false },
]

export default function RegisterScreen({ onNavigate, onRegister }) {
  const [name, setName] = useState('Jordan Taylor')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [year, setYear] = useState('Junior')
  const [major, setMajor] = useState('Cybersecurity')
  const [interests, setInterests] = useState(DEFAULT_INTERESTS)
  const [custom, setCustom] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  const selectedCount = useMemo(() => interests.filter((i) => i.on).length, [interests])

  function toggleInterest(idx) {
    setInterests((current) => current.map((item, i) => (i === idx ? { ...item, on: !item.on } : item)))
  }

  function addInterest() {
    const cleaned = custom.trim().replace(/[✓+]/g, '').trim()
    if (!cleaned) return
    const label = cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
    if (interests.some((i) => i.name.toLowerCase() === label.toLowerCase())) {
      setCustom('')
      return
    }
    setInterests((current) => [...current, { name: label, on: true }])
    setCustom('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    if (!email.trim()) {
      setError('Enter your NKU email.')
      return
    }
    setBusy(true)
    try {
      await onRegister({
        name: name.trim(),
        email: email.trim(),
        password,
        year,
        major: major.trim(),
        interests: interests.filter((i) => i.on).map((i) => i.name),
      })
      onNavigate('home')
    } catch (err) {
      setError(err.message || 'Could not create account.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="h-full flex flex-col bg-canvas">
      <header className="px-6 pt-4 pb-4 bg-white border-b border-line flex items-center gap-4">
        <button
          type="button"
          onClick={() => onNavigate('login')}
          aria-label="Back"
          className="w-12 h-12 rounded-lg border border-line bg-white flex items-center justify-center"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </button>
        <div className="flex-1 text-left">
          <h1 className="text-xl font-bold tracking-tight leading-[1.3]">Make account</h1>
        </div>
        <span className="text-[12px] font-semibold text-body bg-wash border border-line rounded-md px-3 py-2">
          Registration
        </span>
      </header>

      <main className="flex-1 overflow-y-auto no-scrollbar p-6 pb-32 space-y-6 text-left">
        {error && (
          <p role="alert" className="bg-[#FEF2F2] border border-[#FECACA] rounded-lg px-4 py-4 text-[14px] font-semibold text-[#B91C1C] leading-[1.5]">
            {error}
          </p>
        )}

        <section className="bg-white border border-line rounded-xl p-6 shadow-card">
          <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight leading-[1.3]">
            <span className="w-8 h-8 rounded-full bg-ink text-white text-[13px] font-bold flex items-center justify-center tnum shrink-0">
              1
            </span>
            Step 1: Credentials
          </h2>
          <div className="mt-4 grid gap-2">
            <label className="flex items-center justify-between gap-4 min-h-14 bg-white border border-line rounded-lg px-4 py-2">
              <span className="text-[11px] font-bold tracking-[0.06em] uppercase text-body shrink-0">Name:</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
                className="text-right text-[15px] font-medium leading-[1.6] text-ink w-2/3 bg-transparent"
                aria-label="Full name"
              />
            </label>
            <label className="flex items-center justify-between gap-4 min-h-14 bg-white border border-line rounded-lg px-4 py-2">
              <span className="text-[11px] font-bold tracking-[0.06em] uppercase text-body shrink-0">Email:</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@nku.edu"
                autoComplete="email"
                className="text-right text-[15px] font-medium leading-[1.6] text-ink w-2/3 bg-transparent placeholder:text-faint"
                aria-label="NKU email"
              />
            </label>
            <label className="flex items-center justify-between gap-4 min-h-14 bg-white border border-line rounded-lg px-4 py-2">
              <span className="text-[11px] font-bold tracking-[0.06em] uppercase text-body shrink-0">Pswd:</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="Min. 8 characters"
                className="text-right text-[15px] font-medium leading-[1.6] text-ink w-2/3 bg-transparent placeholder:text-faint placeholder:tracking-normal tracking-[0.2em]"
                aria-label="Password"
              />
            </label>
          </div>
        </section>

        <section className="bg-white border border-nku rounded-xl p-6 shadow-card">
          <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight leading-[1.3]">
            <span className="w-8 h-8 rounded-full bg-nku text-ink text-[13px] font-bold flex items-center justify-center tnum shrink-0">
              2
            </span>
            Step 2: Profile &amp; Interests
          </h2>
          <div className="mt-4 grid gap-2">
            <label className="flex items-center justify-between gap-4 h-14 border border-line rounded-lg px-4 bg-white">
              <span className="text-[11px] font-bold tracking-[0.06em] uppercase text-body">Year:</span>
              <select
                value={year}
                onChange={(e) => setYear(e.target.value)}
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
              <label htmlFor="reg-major" className="text-[11px] font-bold tracking-[0.06em] uppercase text-body">
                Major:
              </label>
              <input
                id="reg-major"
                type="text"
                value={major}
                onChange={(e) => setMajor(e.target.value)}
                placeholder="e.g. Cybersecurity"
                className="text-[15px] font-medium bg-transparent text-right w-2/3 text-ink placeholder:text-faint"
              />
            </div>
            <div className="border border-line rounded-lg p-4">
              <p className="text-[11px] font-bold tracking-[0.06em] uppercase text-body">
                Interests selected: <span className="tnum">{selectedCount}</span>
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {interests.map((item, idx) => (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => toggleInterest(idx)}
                    className={`text-[12px] font-semibold rounded-md px-3 py-2 border ${
                      item.on
                        ? INTEREST_PALETTE[idx % INTEREST_PALETTE.length]
                        : 'bg-wash text-body border-line'
                    }`}
                  >
                    {item.name} {item.on ? '✓' : '+'}
                  </button>
                ))}
              </div>
              <div className="mt-4 flex items-center gap-2">
                <input
                  value={custom}
                  onChange={(e) => setCustom(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addInterest()
                    }
                  }}
                  type="text"
                  placeholder="Type an interest, e.g. Chess"
                  maxLength={24}
                  className="h-12 px-4 flex-1 min-w-0 bg-white border border-line rounded-lg text-[15px] leading-[1.6] text-ink"
                />
                <button
                  type="button"
                  onClick={addInterest}
                  className="h-12 px-4 rounded-lg bg-ink text-white font-semibold text-[14px] shrink-0"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="absolute bottom-0 inset-x-0 p-6 pt-8 bg-gradient-to-t from-white via-white to-transparent text-left">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={busy}
          className="w-full h-14 px-8 rounded-lg bg-nku font-bold text-[15px] text-ink shadow-card active:scale-[0.99] transition disabled:opacity-60"
        >
          {busy ? 'CREATING…' : selectedCount > 0 ? 'FINISH' : 'SKIP FOR NOW'}
        </button>
        <button
          type="button"
          onClick={() => onNavigate('login')}
          className="w-full text-left mt-4 text-[14px] text-muted leading-[1.6]"
        >
          Already have an account?{' '}
          <span className="font-semibold text-ink underline underline-offset-2">Login</span>
        </button>
      </footer>
    </div>
  )
}
