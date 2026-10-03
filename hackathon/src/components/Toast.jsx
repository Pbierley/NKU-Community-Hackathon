import { useEffect } from 'react'

export default function Toast({ message, onDone, duration = 1800 }) {
  useEffect(() => {
    if (!message) return
    const timer = setTimeout(onDone, duration)
    return () => clearTimeout(timer)
  }, [message, onDone, duration])

  if (!message) return null
  return (
    <div
      role="status"
      className="absolute left-4 right-4 sm:left-1/2 sm:right-auto sm:w-full sm:max-w-md sm:-translate-x-1/2 bottom-6 z-[60] bg-ink text-white text-[13px] font-semibold leading-[1.5] rounded-lg px-4 py-4 shadow-card"
    >
      {message}
    </div>
  )
}
