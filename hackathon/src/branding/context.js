import { createContext } from 'react'
import { DEFAULT_BRANDING } from './branding'

export const BrandingContext = createContext({
  branding: DEFAULT_BRANDING,
  loading: true,
  error: null,
  refresh: async () => {},
  updateBranding: async () => {},
})
