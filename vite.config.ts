import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    // En test (Vitest), aucun plugin app (React/Tailwind/PWA) : tests côté Node.
    plugins: process.env.VITEST ? [] : [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['logo.png'],
        manifest: {
          name: 'Kinetic — exercices & entraînement',
          short_name: 'Kinetic',
          description:
            'Bibliothèque d\'exercices de musculation : muscles, exécution, et savoir d\'entraînement sourcé. Utilisable hors-ligne.',
          lang: 'fr',
          theme_color: '#0f172a',
          background_color: '#0f172a',
          display: 'standalone',
          orientation: 'portrait',
          start_url: '/',
          icons: [
            {src: 'logo.png', sizes: '512x512', type: 'image/png', purpose: 'any'},
            {src: 'logo.png', sizes: '512x512', type: 'image/png', purpose: 'maskable'},
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/api\//],
          runtimeCaching: [
            {
              // Auth & sync : jamais en cache, toujours le réseau (données utilisateur).
              urlPattern: ({url}) => url.pathname.startsWith('/api/auth') || url.pathname.startsWith('/api/sync'),
              handler: 'NetworkOnly',
            },
            {
              // Bibliothèque (lecture seule, quasi figée) : servie depuis le cache, revalidée
              // en arrière-plan -> serveur très peu sollicité après le 1er chargement.
              urlPattern: ({url}) => url.pathname.startsWith('/api/'),
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'library-api',
                expiration: {maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 7},
              },
            },
            {
              // Images d'exercices (GitHub raw) : mises en cache au 1er affichage
              // -> hors-ligne et instantanees ensuite, zero stockage serveur.
              urlPattern: ({url}) => url.href.startsWith('https://raw.githubusercontent.com/yuhonas/free-exercise-db/'),
              handler: 'CacheFirst',
              options: {
                cacheName: 'exercise-images',
                expiration: {maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 60},
                cacheableResponse: {statuses: [0, 200]},
              },
            },
            {
              // Feuille de style Google Fonts (Inter + Space Grotesk).
              urlPattern: ({url}) => url.origin === 'https://fonts.googleapis.com',
              handler: 'StaleWhileRevalidate',
              options: {cacheName: 'google-fonts-stylesheets'},
            },
            {
              // Fichiers woff2 des polices : mis en cache -> dispo hors-ligne ensuite.
              urlPattern: ({url}) => url.origin === 'https://fonts.gstatic.com',
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-webfonts',
                expiration: {maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365},
                cacheableResponse: {statuses: [0, 200]},
              },
            },
          ],
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
  };
});
