import { registerSW } from 'virtual:pwa-register';

// Service Worker の登録。
// vite-plugin-pwa が `virtual:pwa-register` 仮想モジュールを提供してくれるので、
// それを使ってアプリ起動時に SW を登録する。
//
// registerType: 'autoUpdate' を設定しているため、新しい SW が見つかったら
// 自動的に有効化される（onNeedRefresh は呼ばれない想定）。
// ただし将来 prompt 型に切り替える余地を残すため、コールバックは置いておく。
export function registerServiceWorker() {
  if (typeof window === 'undefined') return;

  registerSW({
    immediate: true,
    onRegisteredSW(swUrl) {
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.info('[PWA] Service Worker registered:', swUrl);
      }
    },
    onRegisterError(error) {
      // eslint-disable-next-line no-console
      console.error('[PWA] Service Worker registration failed:', error);
    },
  });
}
