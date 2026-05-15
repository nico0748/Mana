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
        // ランタイムキャッシュ。React Query 側の IDB 永続化と二段構えで、
        // SW レベルでも /api/* の GET レスポンスを保持しておく。
        // これにより React Query キャッシュが何らかの理由で消えてもネットワーク層で
        // 直近のレスポンスを返せる（バックアップ層として機能）。
        runtimeCaching: [
          {
            // 自身のオリジン配下の API GET のみ対象（非 GET は SW で扱わない）。
            urlPattern: ({ url, request, sameOrigin }) => {
              return sameOrigin && request.method === 'GET' && url.pathname.startsWith('/api/');
            },
            handler: 'NetworkFirst',
            method: 'GET',
            options: {
              cacheName: 'doujin-pp-api-cache-v1',
              // オンライン時は 3 秒以内に応答がなければキャッシュを使う。
              networkTimeoutSeconds: 3,
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24, // 24h
              },
              cacheableResponse: {
                // 成功レスポンスのみキャッシュ。401/403/500 等はキャッシュしない。
                statuses: [200],
              },
              // 認証ヘッダを含む API レスポンスをキャッシュする以上、
              // ブラウザ側ストレージ任せ（同一ユーザー前提）でしか守れない。
              // 端末共有時は OS / ブラウザのプロファイル分離に依存する想定。
            },
          },
          {
            // 外部 API（NDL Search / OpenBD など書誌情報）はネットワークの揺らぎが
            // 大きいので StaleWhileRevalidate で UX を安定させる。
            urlPattern: ({ url }) =>
              url.origin === 'https://ndlsearch.ndl.go.jp' ||
              url.origin === 'https://api.openbd.jp' ||
              url.origin === 'https://cover.openbd.jp',
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'doujin-pp-bib-cache-v1',
              expiration: {
                maxEntries: 500,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7d
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
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
