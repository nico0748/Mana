import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // PWA (Progressive Web App) 構成。
    // 目的:
    //   - ホーム画面に追加してネイティブアプリのように起動できる
    //   - 一度開いた後はオフラインでも HTML/JS/CSS が立ち上がる（会場の地下対策）
    // 現フェーズではあくまで「アプリシェル」の永続化のみで、API レスポンスの
    // オフライン化は別 PR で導入する。
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.ico',
        'apple-touch-icon-180x180.png',
        'doujin-pp.svg',
      ],
      manifest: {
        name: '同人++ — 同人活動管理アプリ',
        short_name: '同人++',
        description:
          'サークル購入管理・蔵書管理・即売会MAPをひとつのアプリで。あなたの同人活動にスマートさをプラス！',
        theme_color: '#09090b',
        background_color: '#09090b',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        lang: 'ja',
        icons: [
          {
            src: 'pwa-64x64.png',
            sizes: '64x64',
            type: 'image/png',
          },
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
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Vite が emit する HTML/JS/CSS/画像を全てプリキャッシュ対象に。
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webp,woff,woff2}'],
        // SPA。すべての navigation を index.html にフォールバックさせる。
        navigateFallback: '/index.html',
        // /api/* と sw 自身は navigation fallback から除外。
        navigateFallbackDenylist: [/^\/api\//, /^\/sw\.js$/],
        // 古い SW をすぐ置き換えてユーザーに最新版を届ける。
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        // 1 ファイルあたりのキャッシュ上限を 3MB へ（PDF.js などの大型 chunk 対策）。
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
      },
      devOptions: {
        // dev サーバ起動時は SW を生成しない（HMR と競合するため）。
        enabled: false,
      },
    }),
  ],
  server: {
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
