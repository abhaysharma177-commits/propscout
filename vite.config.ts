import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

/**
 * A relative base, so one build works everywhere: GitHub Pages at
 * /<repo>/, a static host root, or a folder opened directly. Combined with
 * hash routing there is nothing to configure per environment, and no
 * absolute-path env var to get wrong (Git Bash on Windows rewrites a value
 * like "/propscout/" into a Windows path, which silently breaks the build).
 */
const base = './';

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'PropScout — Property Visits',
        short_name: 'PropScout',
        description:
          'Offline companion for property visits: prices, negotiation room, checklists, photos and videos. All data stays on your phone.',
        theme_color: '#1c6b52',
        background_color: '#faf9f6',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '.',
        scope: '.',
        lang: 'en-IN',
        categories: ['productivity', 'utilities'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
      },
      devOptions: { enabled: false },
    }),
  ],
  build: {
    target: 'es2022',
    sourcemap: false,
    chunkSizeWarningLimit: 900,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    globals: true,
  },
});
