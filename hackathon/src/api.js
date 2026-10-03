// Empty in local dev so Vite's /api proxy still reaches the local server.
// Set VITE_API_URL to the Render API origin when building the hosted site.
export function apiUrl(path) {
  const base = String(import.meta.env.VITE_API_URL ?? '').trim().replace(/\/$/, '')
  return `${base}${path}`
}
