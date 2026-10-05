import { useCallback, useEffect, useMemo, useState } from 'react'
import { applyTheme, DEFAULT_BRANDING, fetchBranding, mergeBranding, saveBranding } from './branding'
import { BrandingContext } from './context.js'

export function BrandingProvider({ children }) {
  const [branding, setBranding] = useState(DEFAULT_BRANDING)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    try {
      const next = await fetchBranding()
      setBranding(next)
      applyTheme(next.colors)
      setError(null)
      return next
    } catch (err) {
      setError(err.message || 'Could not load branding.')
      return null
    }
  }, [])

  useEffect(() => {
    let live = true
    applyTheme(DEFAULT_BRANDING.colors)
    fetchBranding()
      .then((next) => {
        if (!live) return
        setBranding(next)
        applyTheme(next.colors)
      })
      .catch((err) => {
        if (!live) return
        setError(err.message || 'Could not load branding.')
      })
      .finally(() => {
        if (live) setLoading(false)
      })
    return () => {
      live = false
    }
  }, [])

  const updateBranding = useCallback(async (patch) => {
    const next = mergeBranding(await saveBranding(patch))
    setBranding(next)
    applyTheme(next.colors)
    return next
  }, [])

  const value = useMemo(
    () => ({ branding, loading, error, refresh, updateBranding }),
    [branding, loading, error, refresh, updateBranding],
  )

  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>
}
