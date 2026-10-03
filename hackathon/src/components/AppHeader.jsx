import LogoButton from './LogoButton'

export default function AppHeader({ onNavigate }) {
  return (
    <header className="px-2 sm:px-4 pt-4 pb-4 flex items-center justify-between gap-2 sm:gap-4 bg-white border-b border-line min-w-0 max-w-full">
      <button
        type="button"
        onClick={() => onNavigate('drawer')}
        aria-label="Open navigation"
        className="w-12 h-12 shrink-0 rounded-lg hover:bg-wash flex items-center justify-center border border-transparent"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="1.8" strokeLinecap="round">
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>
      <LogoButton onClick={() => onNavigate('home')} className="[&_img]:h-8 [&_img]:sm:h-10" />
      <button
        type="button"
        onClick={() => onNavigate('account')}
        aria-label="Account"
        className="w-12 h-12 rounded-full bg-[#FFFBEB] border border-line flex items-center justify-center shrink-0"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#111827">
          <circle cx="12" cy="8.2" r="3.4" />
          <path
            d="M5 19.5c1.4-3.2 4-4.7 7-4.7s5.6 1.5 7 4.7"
            stroke="#111827"
            strokeWidth="1.8"
            fill="none"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </header>
  )
}
