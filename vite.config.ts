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
        includeAssets: ['pwa-icon.svg'],
        manifest: {
          name: 'Salle de sport — exercices & entraînement',
          short_name: 'Salle de sport',
          description:
            'Bibliothèque d\'exercices de musculation : muscles, exécution, et savoir d\'entraînement sourcé. Utilisable hors-ligne.',
          lang: 'fr',
          theme_color: '#0f172a',
          background_color: '#0f172a',
          display: 'standalone',
          orientation: 'portrait',
          start_url: '/',
          icons: [
            {src: 'pwa-icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any'},
            {src: 'pwa-icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable'},
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
          navigateFallback: '/index.html',
          // L'API n'est jamais mise en cache : toujours le réseau (la SPA gère le repli).
          navigateFallbackDenylist: [/^\/api\//],
          runtimeCaching: [
            {
              urlPattern: ({url}) => url.pathname.startsWith('/api/'),
              handler: 'NetworkOnly',
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
