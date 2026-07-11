import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'setylose-logo.svg', 'icons.svg'],
      manifest: {
        name: 'SE Tylose Schichtplan',
        short_name: 'Schichtplan',
        description: 'Schichtplan, Anträge und Lohnzettel für SE Tylose',
        lang: 'de',
        theme_color: '#00869A',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff,woff2}'],
        navigateFallback: '/index.html',
      },
      // Service Worker nur im Build/Deploy aktiv – im Dev (npm run dev) aus, damit HMR nicht stört.
      devOptions: { enabled: false },
    }),
  ],
})
