import { useState } from 'react'

export default function LoginScreen({ onNavigate, onLogin, notice, next }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await onLogin(email.trim(), password)
      onNavigate(next ?? 'home')
    } catch (err) {
      setError(err.message || 'Could not log in.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="screen h-full flex flex-col bg-canvas">
      <main className="flex-1 overflow-y-auto no-scrollbar px-4 sm:px-6 pb-6 pt-8 sm:pt-12 flex flex-col items-center">
        <div className="w-full max-w-md flex flex-col text-left">
          <img src="/logo.avif" alt="Northern Kentucky University logo" className="h-16 w-auto rounded-lg shadow-card mx-auto" />
          <h1 className="mt-8 text-3xl sm:text-4xl font-extrabold tracking-tight leading-[1.2] text-center">
            Northern Kentucky University
          </h1>
          <p className="mt-2 text-[15px] text-body leading-[1.6] text-center">Campus Experience Portal</p>

        <nav className="w-full mt-8 bg-wash rounded-lg p-1 grid grid-cols-2" aria-label="Authentication">
          <button
            type="button"
            className="h-12 rounded-md bg-white shadow-card font-bold text-[14px]"
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => onNavigate('register')}
            className="h-12 rounded-md text-muted font-semibold text-[14px]"
          >
            Register
          </button>
        </nav>

        {notice && (
          <p role="status" className="w-full mt-4 bg-[#FFFBEB] border border-nku rounded-lg px-4 py-3 text-[14px] font-semibold text-ink leading-[1.5]">
            {notice}
          </p>
        )}

        <form onSubmit={handleSubmit} className="w-full mt-8 space-y-4" aria-label="Login form">
          <div>
            <label
              htmlFor="login-email"
              className="text-[11px] font-bold tracking-[0.06em] uppercase text-body"
            >
              NKU Username / Email
            </label>
            <div className="field mt-2 flex items-center gap-2 h-14 bg-white border border-line rounded-lg px-4">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="1.8" strokeLinecap="round">
                <circle cx="12" cy="8" r="3.6" />
                <path d="M4.5 20c1.2-3.4 4-5 7.5-5s6.3 1.6 7.5 5" />
              </svg>
              <input
                id="login-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                placeholder="Email"
                className="w-full bg-transparent text-[15px] font-medium leading-[1.6] text-ink placeholder:text-faint"
              />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between">
              <label
                htmlFor="login-pass"
                className="text-[11px] font-bold tracking-[0.06em] uppercase text-body"
              >
                Password
              </label>
            </div>
            <div className="field mt-2 flex items-center gap-2 h-14 bg-white border border-line rounded-lg px-4">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="1.8" strokeLinecap="round">
                <circle cx="8" cy="15.5" r="3.5" />
                <path d="m11 12.5 8.5-8.5M15.5 7l3 3" />
              </svg>
              <input
                id="login-pass"
                type={showPw ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="Password"
                className="w-full bg-transparent text-[15px] font-medium leading-[1.6] text-ink placeholder:text-faint placeholder:tracking-normal tracking-[0.2em]"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                aria-label={showPw ? 'Hide password' : 'Show password'}
                className="text-muted"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12Z" />
                  <circle cx="12" cy="12" r="2.6" />
                </svg>
              </button>
            </div>
          </div>

          {error && (
            <p role="alert" className="text-[14px] font-semibold text-[#B91C1C] leading-[1.5]">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full h-14 px-8 rounded-lg bg-nku hover:bg-nkuDeep font-bold text-[15px] text-ink shadow-card active:scale-[0.99] transition disabled:opacity-60"
          >
            {busy ? 'LOGGING IN…' : 'LOGIN'}
          </button>
        </form>

        <p className="mt-6 text-[14px] text-body leading-[1.6] text-center">
          <span>Don&rsquo;t have an account?</span>
          <button
            type="button"
            onClick={() => onNavigate('register')}
            className="ml-2 font-semibold underline underline-offset-2"
          >
            Make Account
          </button>
        </p>
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className="mt-3 text-[14px] text-muted leading-[1.6] underline underline-offset-2 self-center"
        >
          Continue without logging in
        </button>

        <div className="flex-1 min-h-8" />
        <footer className="w-full border-t border-line pt-4 text-center">
          <p className="text-[13px] text-muted leading-[1.5]">Secured with NKU Duo MFA Protection</p>
        </footer>
        </div>
      </main>
    </div>
  )
}
