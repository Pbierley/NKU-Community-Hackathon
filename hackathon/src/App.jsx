import { useCallback, useEffect, useState } from 'react'
import { useAuth } from './auth/useAuth'
import NavDrawer from './components/NavDrawer'
import AccountScreen from './screens/AccountScreen'
import EventsScreen from './screens/EventsScreen'
import HomeScreen from './screens/HomeScreen'
import LoginScreen from './screens/LoginScreen'
import RegisterScreen from './screens/RegisterScreen'
import './App.css'

const PROTECTED = new Set(['home', 'events', 'account'])

function App() {
  const { user, loading, login, register, logout } = useAuth()
  const [screen, setScreen] = useState('login')
  const [drawerOpen, setDrawerOpen] = useState(false)

  // 'drawer' opens the overlay on top of the current screen instead of replacing it.
  const navigateTo = useCallback((id) => {
    if (id === 'drawer') {
      setDrawerOpen(true)
      return
    }
    setDrawerOpen(false)
    setScreen(id)
  }, [])

  // Derive the visible screen instead of syncing it in an effect:
  // signed-out users never see protected screens, and a restored session
  // lands on home instead of flashing the login form.
  const visibleScreen =
    !user && PROTECTED.has(screen)
      ? 'login'
      : user && (screen === 'login' || screen === 'register')
        ? 'home'
        : screen

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key !== 'Escape') return
      setDrawerOpen(false)
      setScreen((s) => (s === 'login' || s === 'register' ? s : 'home'))
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  async function handleLogout() {
    await logout()
    setDrawerOpen(false)
    setScreen('login')
  }

  if (loading) {
    return (
      <div className="bg-[#E9EAEC] min-h-[100dvh] flex justify-center md:items-center md:py-8">
        <div className="w-full max-w-[480px] md:max-w-[560px] h-[100dvh] md:h-[92dvh] md:rounded-2xl bg-canvas flex items-center justify-center">
          <p className="text-[15px] text-muted font-medium">Loading Norse…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[#E9EAEC] text-ink leading-[1.6] min-h-[100dvh] flex justify-center md:items-center md:py-8">
      <div className="w-full max-w-[480px] md:max-w-[560px] h-[100dvh] md:h-[92dvh] md:rounded-2xl bg-canvas relative overflow-hidden border border-line flex flex-col shadow-card">
        {visibleScreen === 'login' && <LoginScreen key="login" onNavigate={navigateTo} onLogin={login} />}
        {visibleScreen === 'register' && (
          <RegisterScreen key="register" onNavigate={navigateTo} onRegister={register} />
        )}
        {visibleScreen === 'home' && <HomeScreen key="home" onNavigate={navigateTo} user={user} />}
        {visibleScreen === 'events' && (
          <EventsScreen key="events" onNavigate={navigateTo} user={user} />
        )}
        {visibleScreen === 'account' && (
          <AccountScreen key="account" onNavigate={navigateTo} user={user} onLogout={handleLogout} />
        )}
        <NavDrawer
          open={drawerOpen}
          user={user}
          onNavigate={navigateTo}
          onClose={() => setDrawerOpen(false)}
          onLogout={handleLogout}
        />
      </div>
    </div>
  )
}

export default App
