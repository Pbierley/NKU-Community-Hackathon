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

export default function AccountScreen({ onNavigate, user, onLogout }) {
  const name = user?.name ?? 'Norse Student'
  const email = user?.email ?? ''
  const year = user?.year || '—'
  const major = user?.major || 'Undeclared'
  const interests = user?.interests?.length ? user.interests : ['Tech']

  return (
    <div className="screen h-full flex flex-col bg-canvas">
      <header className="px-6 py-4 flex items-center gap-4 bg-white border-b border-line sticky top-0 z-10 text-left">
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
        <h2 className="flex-1 text-xl font-bold tracking-tight leading-[1.3] text-left">Account</h2>
        <span className="w-12 shrink-0" />
      </header>

      <main className="flex-1 overflow-y-auto no-scrollbar p-4 sm:p-6 text-left flex flex-col items-center">
        <section className="w-full max-w-2xl bg-white border border-line rounded-xl p-6 sm:p-8 shadow-card" aria-label="Account">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-ink text-white font-bold text-[16px] flex items-center justify-center shrink-0">
              {initials(name)}
            </div>
            <div className="min-w-0 text-left">
              <h3 className="text-xl font-bold tracking-tight leading-[1.3]">{name}</h3>
              <p className="text-[13px] text-muted leading-[1.5] break-all">{email}</p>
              <span className="inline-block mt-2 text-[12px] font-semibold bg-ink text-white rounded-md px-3 py-2">
                {year}
              </span>
            </div>
          </div>

          <dl className="mt-6 space-y-4">
            <div className="bg-canvas border border-line rounded-lg px-4 h-14 flex items-center justify-between gap-4">
              <dt className="text-[11px] font-bold tracking-[0.06em] uppercase text-body">Year</dt>
              <dd className="text-[15px] font-semibold leading-[1.6] bg-white border border-line rounded-md px-3 py-2 tnum">
                {year}
              </dd>
            </div>
            <div className="bg-canvas border border-line rounded-lg px-4 py-4 flex items-center justify-between gap-4">
              <dt className="text-[11px] font-bold tracking-[0.06em] uppercase text-body shrink-0">Major</dt>
              <dd className="text-right text-[15px] font-semibold leading-[1.6] min-w-0 break-words">{major}</dd>
            </div>
            <div className="bg-canvas border border-line rounded-lg p-4">
              <dt className="text-[11px] font-bold tracking-[0.06em] uppercase text-body">Interests</dt>
              <dd className="mt-4 flex flex-wrap gap-2 text-[12px] font-semibold">
                {interests.map((interest) => (
                  <span
                    key={interest}
                    className="bg-wash text-body border border-line rounded-md px-3 py-2 uppercase"
                  >
                    {interest}
                  </span>
                ))}
              </dd>
            </div>
          </dl>

          <div className="mt-6 space-y-2">
            <button
              type="button"
              onClick={() => onNavigate('home')}
              className="w-full h-14 px-8 rounded-lg bg-ink text-white font-semibold text-[15px]"
            >
              Back to Home
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="w-full h-14 px-8 rounded-lg bg-[#FEF2F2] text-[#B91C1C] border border-[#FECACA] font-semibold text-[15px]"
            >
              Sign Out
            </button>
          </div>
        </section>
      </main>
    </div>
  )
}
