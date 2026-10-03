import basicSsl from '@vitejs/plugin-basic-ssl'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  // Phones only allow location and compass on HTTPS, so `npm run dev:phone` adds a self-signed cert.
  plugins: [react(), mode === 'phone' && basicSsl()],
  server: {
    // Buildings.json lives at the repo root, one level above this app.
    fs: { allow: ['..'] },
    // Lets a Cloudflare quick tunnel reach the dev server for phone testing.
    allowedHosts: ['.trycloudflare.com'],
    // The API runs separately (`npm run server`) so MongoDB credentials stay off the client.
    proxy: { '/api': 'http://localhost:3001' },
  },
}))
