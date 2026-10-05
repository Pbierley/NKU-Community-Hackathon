import { useMemo, useState } from 'react'
import { isNkuEmail } from '../auth/accountTypes'
import CampusRoleFields from '../components/CampusRoleFields'
import InterestsEditor from './InterestsEditor'

const DEFAULT_INTERESTS = [
  { name: 'Sports', on: true },
  { name: 'Arts', on: true },
  { name: 'Music', on: true },
  { name: 'Tech', on: false },
]

export default function RegisterScreen({ onNavigate, onRegister, next }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [year, setYear] = useState('Junior')
  const [major, setMajor] = useState('')
  const [interests, setInterests] = useState(DEFAULT_INTERESTS)
  const [campusRole, setCampusRole] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  const selectedCount = useMemo(() => interests.filter((i) => i.on).length, [interests])

  function toggleInterest(idx) {
    setInterests((current) => current.map((item, i) => (i === idx ? { ...item, on: !item.on } : item)))
  }

  function addInterest(label) {
    if (!label) return
    if (interests.some((i) => i.name.toLowerCase() === label.toLowerCase())) return
    // No cap on the number of interests — custom tags are welcome.
    setInterests((current) => [...current, { name: label, on: true, custom: true }])
  }

  function removeInterest(idx) {
    setInterests((current) => current.filter((_, i) => i !== idx))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    if (!email.trim()) {
      setError('Enter your email.')
      return
    }
    if (isNkuEmail(email) && !campusRole) {
      setError('Choose student or staff.')
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
        campusRole: isNkuEmail(email) ? campusRole : '',
      })
      onNavigate(next ?? 'home')
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

      <main className="flex-1 min-h-0 overflow-y-auto no-scrollbar p-4 sm:p-6 pb-8 space-y-6 text-left flex flex-col items-center">
        {error && (
          <p role="alert" className="w-full max-w-2xl bg-[#FEF2F2] border border-[#FECACA] rounded-lg px-4 py-4 text-[14px] font-semibold text-[#B91C1C] leading-[1.5]">
            {error}
          </p>
        )}

        <section className="w-full max-w-2xl bg-white border border-line rounded-xl p-6 shadow-card">
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
                placeholder="Name"
                className="text-right text-[15px] font-medium leading-[1.6] text-ink w-2/3 bg-transparent placeholder:text-faint"
                aria-label="Full name"
              />
            </label>
            <label className="flex items-center justify-between gap-4 min-h-14 bg-white border border-line rounded-lg px-4 py-2">
              <span className="text-[11px] font-bold tracking-[0.06em] uppercase text-body shrink-0">Email:</span>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (!isNkuEmail(e.target.value)) setCampusRole('')
                }}
                required
                placeholder="you@nku.edu"
                autoComplete="email"
                className="text-right text-[15px] font-medium leading-[1.6] text-ink w-2/3 bg-transparent placeholder:text-faint"
                aria-label="Email"
              />
            </label>
            {isNkuEmail(email) && <CampusRoleFields value={campusRole} onChange={setCampusRole} />}
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

        <section className="w-full max-w-2xl bg-white border border-nku rounded-xl p-6 shadow-card">
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
        <div className="w-full max-w-2xl mx-auto">
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
        </div>
      </footer>
    </div>
  )
}
