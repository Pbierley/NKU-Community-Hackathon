import { useCallback, useEffect, useRef, useState } from 'react'

function screenAngle() {
  return window.screen?.orientation?.angle ?? window.orientation ?? 0
}

function compassHeading(event) {
  if (typeof event.webkitCompassHeading === 'number') {
    return event.webkitCompassHeading
  }
  if (event.absolute && typeof event.alpha === 'number') {
    return 360 - event.alpha
  }
  return null
}

export function useUserLocation() {
  const [position, setPosition] = useState(null)
  const [accuracy, setAccuracy] = useState(null)
  const [heading, setHeading] = useState(null)
  const [error, setError] = useState(() =>
    'geolocation' in navigator ? null : 'This browser does not support location.',
  )
  const [compassEnabled, setCompassEnabled] = useState(false)
  const compassRef = useRef(false)

  useEffect(() => {
    if (!('geolocation' in navigator)) return
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        setPosition([pos.coords.latitude, pos.coords.longitude])
        setAccuracy(pos.coords.accuracy)
        setError(null)
        if (!compassRef.current && Number.isFinite(pos.coords.heading)) {
          setHeading(pos.coords.heading)
        }
      },
      (err) => setError(err.message),
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 },
    )
    return () => navigator.geolocation.clearWatch(id)
  }, [])

  useEffect(() => {
    compassRef.current = compassEnabled
  }, [compassEnabled])

  useEffect(() => {
    if (!compassEnabled) return
    const onOrientation = (event) => {
      const h = compassHeading(event)
      if (h !== null) setHeading((h + screenAngle() + 360) % 360)
    }
    const eventName =
      'ondeviceorientationabsolute' in window ? 'deviceorientationabsolute' : 'deviceorientation'
    window.addEventListener(eventName, onOrientation)
    return () => window.removeEventListener(eventName, onOrientation)
  }, [compassEnabled])

  // iOS only grants compass access from a user gesture, so call this from a click handler.
  const enableCompass = useCallback(async () => {
    const Orientation = window.DeviceOrientationEvent
    if (!Orientation) {
      setError('This device does not report compass direction.')
      return
    }
    if (typeof Orientation.requestPermission === 'function') {
      try {
        if ((await Orientation.requestPermission()) !== 'granted') {
          setError('Compass permission was denied.')
          return
        }
      } catch (err) {
        setError(err.message)
        return
      }
    }
    setCompassEnabled(true)
  }, [])

  return { position, accuracy, heading, error, compassEnabled, enableCompass }
}
