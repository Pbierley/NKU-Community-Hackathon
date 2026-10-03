import { useEvents } from '../Communication/useEvents'

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

export default function NavDrawer({ open, user, onNavigate, onClose, onLogout }) {
  const { events } = useEvents()
  const name = user?.name ?? 'Norse Student'
  const email = user?.email ?? ''
  const meta = [user?.year, user?.major].filter(Boolean).join(' • ') || 'NKU Student'

  return (
    <div
      className={`absolute inset-0 z-50 ${open ? '' : 'pointer-events-none'}`}
      aria-hidden={!open}
    >
      <div
        className={`absolute inset-0 transition-opacity duration-200 ${open ? 'opacity-100' : 'opacity-0'}`}
        style={{ background: 'rgba(17,24,39,0.45)', backdropFilter: 'blur(8px)' }}
        onClick={onClose}
      />
      <aside
        className="absolute left-0 top-0 bottom-0 w-[85%] max-w-[340px] bg-white flex flex-col rounded-r-xl overflow-hidden shadow-card border-r border-line transition-transform duration-300 ease-out"
        style={{ transform: open ? 'translateX(0)' : 'translateX(-102%)' }}
      >
        <header className="px-6 pt-8 pb-6 flex items-center gap-4 border-b border-line text-left">
          <div className="w-12 h-12 rounded-full bg-ink text-white font-bold text-[15px] flex items-center justify-center shrink-0">
            {initials(name)}
          </div>
          <div className="min-w-0 text-left">
            <h2 className="text-xl font-bold tracking-tight leading-[1.3] truncate">{name}</h2>
            <p className="text-[13px] text-muted leading-[1.5] break-all">{email}</p>
            <span className="inline-block mt-2 text-[12px] font-semibold text-body bg-wash border border-line rounded-md px-3 py-2">
              {meta}
            </span>
          </div>
        </header>

        <nav className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-2 text-left" aria-label="App navigation">
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="w-full flex items-center gap-4 px-4 h-12 rounded-lg hover:bg-canvas text-left font-semibold text-[15px] leading-[1.6]"
          >
            <span className="w-8 h-8 rounded-lg bg-wash flex items-center justify-center shrink-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="1.8" strokeLinecap="round">
                <path d="m4 11 8-7 8 7v9a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1v-9Z" />
              </svg>
            </span>
            Home
            <span className="ml-auto text-faint">›</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('events')}
            className="w-full flex items-center gap-4 px-4 h-14 rounded-lg bg-[#FFFBEB] border border-nku text-left"
          >
            <span className="w-8 h-8 rounded-lg bg-nku flex items-center justify-center shrink-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="1.8">
                <rect x="4" y="5.5" width="16" height="15" rx="2.5" />
                <path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" strokeLinecap="round" />
              </svg>
            </span>
            <span className="font-bold text-[14px] tracking-wide">EVENTS</span>
            <span className="ml-auto text-[12px] font-semibold bg-ink text-white rounded-md px-3 py-2 tnum">
              {events.length} New
            </span>
          </button>

          <a
            href="https://myengagement.nku.edu/home_login"
            target="_blank"
            rel="noreferrer"
            className="w-full flex items-center gap-4 px-4 py-4 rounded-lg border border-dashed border-line text-left"
          >
            <span className="w-8 h-8 rounded-lg bg-ink text-white flex items-center justify-center shrink-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="12" cy="9" r="3.2" />
                <path d="M5.5 19.5c1.3-3 3.7-4.3 6.5-4.3s5.2 1.3 6.5 4.3" strokeLinecap="round" />
              </svg>
            </span>
            <span className="font-semibold text-[15px] leading-[1.5]">
              MY Engagement
              <br />
              <span className="text-[13px] font-normal text-muted">Student Portal &amp; Clubs</span>
            </span>
          </a>

          <p className="px-4 pt-6 pb-2 text-[11px] font-bold tracking-[0.06em] uppercase text-muted">
            Campus resources
          </p>
          <button type="button" className="w-full flex items-center gap-4 px-4 h-12 rounded-lg hover:bg-canvas text-left text-[15px] leading-[1.6]">
            Norse Shuttle Tracker
          </button>
          <button type="button" className="w-full flex items-center gap-4 px-4 h-12 rounded-lg hover:bg-canvas text-left text-[15px] leading-[1.6]">
            Campus Safety &amp; Escort
          </button>
          <button
            type="button"
            onClick={() => onNavigate('account')}
            className="w-full flex items-center gap-4 px-4 h-12 rounded-lg hover:bg-canvas text-left text-[15px] leading-[1.6]"
          >
            Preferences &amp; Settings
          </button>
        </nav>

        <footer className="p-6 pt-2 text-left">
          {user ? (
            <button
              type="button"
              onClick={onLogout}
              className="w-full h-14 px-8 rounded-lg bg-[#FEF2F2] text-[#B91C1C] border border-[#FECACA] font-semibold text-[15px]"
            >
              {`Sign Out (${user.name.split(' ')[0]})`}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onNavigate('login')}
              className="w-full h-14 px-8 rounded-lg bg-ink text-white font-semibold text-[15px]"
            >
              Sign In
            </button>
          )}
        </footer>
      </aside>
    </div>
  )
}
