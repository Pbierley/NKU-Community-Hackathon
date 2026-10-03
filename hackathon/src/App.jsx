import { useCallback, useEffect, useState } from 'react'
import NavDrawer from './components/NavDrawer'
import AccountScreen from './screens/AccountScreen'
import EventsScreen from './screens/EventsScreen'
import HomeScreen from './screens/HomeScreen'
import LoginScreen from './screens/LoginScreen'
import RegisterScreen from './screens/RegisterScreen'
import './App.css'

const SCREENS = {
  login: LoginScreen,
  register: RegisterScreen,
  home: HomeScreen,
  events: EventsScreen,
  account: AccountScreen,
}

function App() {
  const [screen, setScreen] = useState('home')
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

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key !== 'Escape') return
      setDrawerOpen(false)
      setScreen((s) => (s === 'login' ? 'login' : 'home'))
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  const Screen = SCREENS[screen]

  return (
    <div className="bg-[#E9EAEC] text-ink leading-[1.6] min-h-[100dvh] flex justify-center md:items-center md:py-8">
      <div className="w-full max-w-[480px] md:max-w-[560px] h-[100dvh] md:h-[92dvh] md:rounded-2xl bg-canvas relative overflow-hidden border border-line flex flex-col shadow-card">
        <Screen key={screen} onNavigate={navigateTo} />
        <NavDrawer open={drawerOpen} onNavigate={navigateTo} onClose={() => setDrawerOpen(false)} />
      </div>
    </div>
  )
}

export default App
