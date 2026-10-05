import { useContext } from 'react'
import { BrandingContext } from './context.js'

export function useBranding() {
  return useContext(BrandingContext)
}
