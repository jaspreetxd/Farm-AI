import { defineConfig, type Plugin } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { handleApiRequest } from './api-handler.js'

function apiMiddleware(): Plugin {
  return {
    name: 'agro-rakshak-api',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        if (!request.url?.startsWith('/api/')) {
          next()
          return
        }
        void handleApiRequest(request, response).catch(() => {
          if (!response.headersSent) {
            response.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' })
            response.end(JSON.stringify({ error: 'The API request could not be completed.' }))
          }
        })
      })
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  // Vercel's Supabase integration exposes browser-safe values with this prefix.
  // Only publishable/anon settings may use NEXT_PUBLIC_; never place server secrets there.
  envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
  // Give each Vite process its own cache to avoid Windows unlink errors when
  // another dev session still has the previous optimizer files open.
  cacheDir: `node_modules/.vite-agro-rakshak-${process.pid}`,
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    apiMiddleware()
  ],
  server: {
    proxy: {
      '/ollama': {
        target: 'http://127.0.0.1:11434',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ollama/, '')
      }
    }
  }
})
