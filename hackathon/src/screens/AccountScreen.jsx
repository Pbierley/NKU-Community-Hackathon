export default function AccountScreen({ onNavigate }) {
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
      <main className="flex-1 overflow-y-auto no-scrollbar p-6 text-left" />
    </div>
  )
}
