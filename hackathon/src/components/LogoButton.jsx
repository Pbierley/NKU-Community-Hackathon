import { logoSrc } from '../branding/branding'
import { useBranding } from '../branding/useBranding.js'

const SIZES = { sm: 'h-10', lg: 'h-16' }

export default function LogoButton({ onClick, size = 'sm', className = '' }) {
  const { branding } = useBranding()
  const school = branding.schoolName || 'Campus'
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${school} — go to home`}
      className={`rounded-lg shrink-0 ${className}`}
    >
      <img
        src={logoSrc(branding)}
        alt={`${school} logo`}
        className={`${SIZES[size]} w-auto rounded-lg`}
      />
    </button>
  )
}
