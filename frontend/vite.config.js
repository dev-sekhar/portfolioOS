import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const frontendHost = env.VITE_FRONTEND_HOST || '127.0.0.1'
  const frontendPort = Number(env.VITE_FRONTEND_PORT || 5173)

  return {
    plugins: [react()],
    server: {
      host: frontendHost,
      port: frontendPort,
      middlewareMode: false,
      headers: {
        // Keep OAuth popup messaging working in local development.
        'Cross-Origin-Opener-Policy': 'unsafe-none',
        'Cross-Origin-Embedder-Policy': 'unsafe-none',
      },
    },
  }
})
