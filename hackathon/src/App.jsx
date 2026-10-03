import { useCallback, useEffect, useState } from 'react'
import { useAuth } from './auth/useAuth'
import NavDrawer from './components/NavDrawer'
import AccountScreen from './screens/AccountScreen'
import EventsScreen from './screens/EventsScreen'
import HomeScreen from './screens/HomeScreen'
import LoginScreen from './screens/LoginScreen'
import ParkingScreen from './screens/ParkingScreen'
import RegisterScreen from './screens/RegisterScreen'
import './App.css'

// Home (map) is public; events and account require a signed-in user and
// redirect to login when logged out.
const PROTECTED = new Set(['events', 'account'])

function App() {
  const { user, loading, login, register, logout, updateProfile } = useAuth()
  const [screen, setScreen] = useState('home')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [authNotice, setAuthNotice] = useState(null)
  // Where a logged-out user was headed when they hit a protected screen,
  // so login/register can send them there afterwards instead of home.
  const [pendingScreen, setPendingScreen] = useState(null)

  // 'drawer' opens the overlay on top of the current screen instead of replacing it.
  const navigateTo = useCallback((id) => {
    if (id === 'drawer') {
      setDrawerOpen(true)
      return
    }
    setDrawerOpen(false)
    setScreen(id)
    // Remember why a logged-out user was sent to login so the login
    // screen can explain (e.g. "To view events, sign in").
    if (PROTECTED.has(id)) {
      setAuthNotice(id === 'events' ? 'To view events, sign in' : 'To view your account, sign in')
      setPendingScreen(id)
    } else if (id === 'home') {
      setAuthNotice(null)
      setPendingScreen(null)
    }
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
    setAuthNotice(null)
    setPendingScreen(null)
    setScreen('home')
  }

  const shell =
    'w-full h-full max-w-[480px] md:max-w-none bg-canvas relative overflow-hidden border-x border-line md:border-0 flex flex-col md:shadow-none'

  if (loading) {
    return (
      <div className="bg-[#E9EAEC] text-ink leading-[1.6] min-h-[100dvh] h-[100dvh] flex justify-center">
        <div className={`${shell} items-center justify-center`}>
          <p className="text-[15px] text-muted font-medium">Loading Norse…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[#E9EAEC] text-ink leading-[1.6] min-h-[100dvh] h-[100dvh] flex justify-center">
      <div className={shell}>
        {visibleScreen === 'login' && (
          <LoginScreen
            key="login"
            onNavigate={navigateTo}
            onLogin={login}
            notice={!user ? authNotice : null}
            next={pendingScreen}
          />
        )}
        {visibleScreen === 'register' && (
          <RegisterScreen key="register" onNavigate={navigateTo} onRegister={register} next={pendingScreen} />
        )}
        {visibleScreen === 'home' && <HomeScreen key="home" onNavigate={navigateTo} user={user} />}
        {visibleScreen === 'parking' && <ParkingScreen key="parking" onNavigate={navigateTo} />}
        {visibleScreen === 'events' && <EventsScreen key="events" onNavigate={navigateTo} user={user} />}
        {visibleScreen === 'account' && (
          <AccountScreen
            key={`account-${user?.id}`}
            onNavigate={navigateTo}
            user={user}
            onLogout={handleLogout}
            onUpdateProfile={updateProfile}
          />
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
