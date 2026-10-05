import { useCallback, useEffect, useState } from 'react'
import { canInviteAdmins } from './auth/accountTypes'
import { useAuth } from './auth/useAuth'
import NavDrawer from './components/NavDrawer'
import { parseEventHash } from './Communication/useEvents'
import AccountScreen from './screens/AccountScreen'
import AdminScreen from './screens/AdminScreen'
import EventsScreen from './screens/EventsScreen'
import HomeScreen from './screens/HomeScreen'
import LoginScreen from './screens/LoginScreen'
import ParkingScreen from './screens/ParkingScreen'
import RegisterScreen from './screens/RegisterScreen'
import SuggestedParkingScreen from './screens/SuggestedParkingScreen'
import ScheduleScreen from './screens/ScheduleScreen'
import './App.css'

// Home (map), parking & rec, and suggested parking are public. Events, account,
// admin, and schedule upload redirect to login when logged out. Admin stays
// hidden unless the signed-in account is an admin or developer.
const PROTECTED = new Set(['events', 'account', 'admin', 'schedule'])

const AUTH_NOTICE = {
  events: 'To view events, sign in',
  account: 'To view your account, sign in',
  admin: 'To open admin, sign in',
  schedule: 'To upload a schedule, sign in',
}

function App() {
  const { user, loading, login, register, logout, updateProfile, inviteAdmin, removeRole, uploadSchedule } = useAuth()
  // A shared event link boots straight into events so the event can open.
  const [screen, setScreen] = useState(() => (parseEventHash() ? 'events' : 'home'))
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [authNotice, setAuthNotice] = useState(null)
  // Where a logged-out user was headed when they hit a protected screen,
  // so login/register can send them there afterwards instead of home.
  const [pendingScreen, setPendingScreen] = useState(() => (parseEventHash() ? 'events' : null))
  // A shared event id waiting to be opened once the events list loads.
  const [pendingEventId, setPendingEventId] = useState(() => parseEventHash())
  // Building to select when the map opens from an event's location.
  const [mapBuildingId, setMapBuildingId] = useState(null)
  // Event to reopen when the map was opened from that event's location.
  const [mapReturnEventId, setMapReturnEventId] = useState(null)

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
      setAuthNotice(AUTH_NOTICE[id] ?? 'Sign in to continue')
      setPendingScreen(id)
    } else if (id === 'home') {
      setAuthNotice(null)
      setPendingScreen(null)
      setPendingEventId(null)
      try {
        if (parseEventHash()) {
          window.history.replaceState(null, '', window.location.pathname + window.location.search)
        }
      } catch {
        /* hash cleanup is best-effort */
      }
    }
  }, [])

  // Consumed by EventsScreen after a shared event opens (or proves unknown).
  const showEventOnMap = useCallback((buildingId, eventId) => {
    setMapBuildingId(buildingId)
    setMapReturnEventId(eventId ?? null)
    setDrawerOpen(false)
    setAuthNotice(null)
    setPendingScreen(null)
    setScreen('home')
  }, [])

  const showScheduleOnMap = useCallback((buildingId) => {
    setMapBuildingId(buildingId)
    setMapReturnEventId(null)
    setDrawerOpen(false)
    setAuthNotice(null)
    setPendingScreen(null)
    setScreen('home')
  }, [])

  const handleMapFocused = useCallback(() => setMapBuildingId(null), [])

  const openEventFromMap = useCallback((eventId) => {
    setMapReturnEventId(null)
    setPendingEventId(eventId)
    try {
      window.history.replaceState(null, '', `#/events/${encodeURIComponent(eventId)}`)
    } catch {
      /* hash sync is best-effort */
    }
    navigateTo('events')
  }, [navigateTo])

  const handleSharedEventOpened = useCallback(() => {
    setPendingEventId(null)
    try {
      if (parseEventHash()) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search)
      }
    } catch {
      /* hash cleanup is best-effort */
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
        : screen === 'admin' && !canInviteAdmins(user)
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
    setPendingEventId(null)
    setMapReturnEventId(null)
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
        {visibleScreen === 'home' && (
          <HomeScreen
            key="home"
            onNavigate={navigateTo}
            user={user}
            focusBuildingId={mapBuildingId}
            onMapFocusHandled={handleMapFocused}
            onOpenEvent={openEventFromMap}
            returnEventId={mapReturnEventId}
            onBackToEvent={openEventFromMap}
          />
        )}
        {visibleScreen === 'parking' && <ParkingScreen key="parking" onNavigate={navigateTo} user={user} />}
        {visibleScreen === 'suggest' && <SuggestedParkingScreen key="suggest" onNavigate={navigateTo} />}
        {visibleScreen === 'schedule' && (
          <ScheduleScreen key="schedule" onNavigate={navigateTo} user={user} onUpload={uploadSchedule} onShowOnMap={showScheduleOnMap} />
        )}
        {visibleScreen === 'events' && (
          <EventsScreen
            key="events"
            onNavigate={navigateTo}
            user={user}
            sharedEventId={user ? pendingEventId : null}
            onSharedEventOpened={handleSharedEventOpened}
            onShowOnMap={showEventOnMap}
          />
        )}
        {visibleScreen === 'admin' && (
          <AdminScreen key="admin" onNavigate={navigateTo} user={user} onInvite={inviteAdmin} onRemove={removeRole} />
        )}
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
