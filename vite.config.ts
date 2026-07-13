import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    // Vue SFC support for .vue files
    vue(),
    tailwindcss(),

    // PWA plugin: generates web manifest, service worker, and offline caching
    VitePWA({
      // Auto-update: new SW activates when a new build is detected
      registerType: 'autoUpdate',

      // Include static assets in the precache manifest
      includeAssets: ['favicon.svg', 'App_Icon.webp', 'pwa-192x192.png', 'pwa-512x512.png'],

      // Web App Manifest (used when user taps "Add to Home Screen" on iPhone)
      manifest: {
        name: 'My Test App',
        short_name: 'TestApp',
        description: 'A basic PWA test app for iPhone Safari',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'App_Icon.webp',
            sizes: 'any',
            type: 'image/webp',
            purpose: 'any',
          },
        ],
      },

      // Workbox service worker configuration for offline support
      workbox: {
        // Precache built assets in production only (dev-dist has no app files in dev)
        globPatterns:
          mode === 'production'
            ? ['**/*.{js,css,html,ico,png,svg,webp,woff2}']
            : [],

        // SPA fallback: serve index.html when navigating offline
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api/],

        // Runtime caching for network requests (optional extra layer)
        runtimeCaching: [
          {
            // Cache same-origin navigation requests
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'pages-cache',
              networkTimeoutSeconds: 3,
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24, // 24 hours
              },
            },
          },
        ],
      },

      // Inject service worker registration into the built index.html
      injectRegister: null,

      // Generate service worker in dev mode for easier testing
      devOptions: {
        enabled: true,
        type: 'module',
      },
    }),
  ],
}))
