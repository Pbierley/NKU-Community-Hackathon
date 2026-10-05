import { apiUrl } from '../api'
import { getAuthToken } from '../auth/useAuth'

export const DEFAULT_BRANDING = {
  schoolName: 'Northern Kentucky University',
  portalTagline: 'Campus Experience Portal',
  colors: {
    nku: '#FFC72C',
    nkuDeep: '#EAB308',
    ink: '#111827',
    body: '#374151',
    muted: '#6B7280',
    faint: '#9CA3AF',
    line: '#E5E7EB',
    canvas: '#F9FAFB',
    wash: '#F3F4F6',
  },
  logoUrl: '',
  map: {
    center: [39.0325, -84.4615],
    bounds: [
      [39.0245, -84.4725],
      [39.0425, -84.45],
    ],
  },
}

export const COLOR_FIELDS = [
  { key: 'nku', label: 'Primary accent', hint: 'Buttons, selected pins, highlights' },
  { key: 'nkuDeep', label: 'Primary hover', hint: 'Hover state + calendar dots' },
  { key: 'ink', label: 'Primary text', hint: 'Headings + dark fills' },
  { key: 'body', label: 'Body text', hint: 'Paragraphs + labels' },
  { key: 'muted', label: 'Secondary text', hint: 'Dates + subtitles' },
  { key: 'faint', label: 'Faint captions', hint: 'Captions only' },
  { key: 'line', label: 'Borders', hint: 'Cards + inputs + dividers' },
  { key: 'canvas', label: 'App background', hint: '60% neutral surface' },
  { key: 'wash', label: 'Wash', hint: 'Wells + unselected chips' },
]

// Applies branding colors at runtime by overriding the Tailwind v4 theme
// variables on :root. Every bg-nku / text-muted / border-line utility reads
// these vars, so the whole app re-themes without a rebuild.
export function applyTheme(colors) {
  if (!colors || typeof document === 'undefined') return
  const next = { ...DEFAULT_BRANDING.colors, ...colors }
  for (const [key, value] of Object.entries(next)) {
    document.documentElement.style.setProperty(`--color-${key}`, value)
  }
}

export function mergeBranding(value) {
  if (!value || typeof value !== 'object') return structuredClone(DEFAULT_BRANDING)
  return {
    schoolName: typeof value.schoolName === 'string' && value.schoolName ? value.schoolName : DEFAULT_BRANDING.schoolName,
    portalTagline: typeof value.portalTagline === 'string' ? value.portalTagline : DEFAULT_BRANDING.portalTagline,
    colors: { ...DEFAULT_BRANDING.colors, ...value.colors },
    logoUrl: typeof value.logoUrl === 'string' ? value.logoUrl : '',
    map: {
      center: Array.isArray(value.map?.center) ? value.map.center : [...DEFAULT_BRANDING.map.center],
      bounds: Array.isArray(value.map?.bounds) ? value.map.bounds : DEFAULT_BRANDING.map.bounds.map((c) => [...c]),
    },
  }
}

export function defaultLogo() {
  return `${import.meta.env.BASE_URL}logo.avif`
}

export function logoSrc(branding) {
  const url = String(branding?.logoUrl ?? '').trim()
  return url || defaultLogo()
}

export async function fetchBranding() {
  const res = await fetch(apiUrl('/api/branding'))
  if (!res.ok) throw new Error(`Server responded ${res.status}`)
  return mergeBranding(await res.json())
}

export async function saveBranding(patch) {
  const headers = { 'Content-Type': 'application/json' }
  const token = getAuthToken()
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(apiUrl('/api/branding'), {
    method: 'PUT',
    headers,
    body: JSON.stringify(patch),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`)
  return mergeBranding(data)
}
