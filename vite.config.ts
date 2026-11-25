import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true
      },
      includeAssets: ['app-icon.svg', 'manifest.json', 'quoc-huy.png', 'co-dang.png'],
      manifestFilename: 'manifest.webmanifest',
      manifest: {
        name: 'App Văn Thư Số 4.0',
        short_name: 'App Văn Thư Số 4.0',
        description:
          'Ứng dụng soạn thảo, rà soát thể thức và xuất văn bản hành chính chuẩn Nghị định 30/2020/NĐ-CP và Hướng dẫn 05-HD/VPTW',
        theme_color: '#1e4b7a',
        background_color: '#f1f5f9',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/app-icon.svg',
            sizes: '192x192 512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ]
});
