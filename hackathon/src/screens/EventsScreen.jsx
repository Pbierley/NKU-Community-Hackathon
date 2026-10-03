import AppHeader from '../components/AppHeader'

export default function EventsScreen({ onNavigate }) {
  return (
    <div className="screen h-full flex flex-col bg-canvas">
      <AppHeader onNavigate={onNavigate} />
      <main className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-4 py-4 text-left" />
    </div>
  )
}
