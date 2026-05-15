import { useCallback, useEffect, useState } from 'react';

// ブラウザがインストール可能と判断したときに発火するイベントの型。
// 公式の lib.dom には型がないので独自に定義。
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

const DISMISS_KEY = 'doujin-pp-install-dismissed-at';
// 一度「あとで」を押されたら、この期間は再表示しない。
const DISMISS_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 日

function isStandaloneMode(): boolean {
  if (typeof window === 'undefined') return false;
  // PWA で起動された Android Chrome / デスクトップ
  if (window.matchMedia('(display-mode: standalone)').matches) return true;
  // iOS Safari でホーム画面から起動
  if ((window.navigator as { standalone?: boolean }).standalone === true) return true;
  return false;
}

function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  // iPad の iPadOS 13 以降は MacIntel として現れるため touch 数で判定。
  const isIPadOS = ua.includes('Macintosh') && navigator.maxTouchPoints > 1;
  return /iPhone|iPad|iPod/.test(ua) || isIPadOS;
}

function wasRecentlyDismissed(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const dismissedAt = Number(raw);
    if (!Number.isFinite(dismissedAt)) return false;
    return Date.now() - dismissedAt < DISMISS_TTL_MS;
  } catch {
    return false;
  }
}

// PWA インストールの可否・トリガをまとめて返すフック。
//
// - canPromptInstall: ブラウザネイティブの prompt() が呼べる（主に Android Chrome）
// - showIOSInstructions: iOS Safari なので手順案内を出すべき
// - standalone: 既にインストール済（バナーを出さない）
export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [standalone, setStandalone] = useState<boolean>(() => isStandaloneMode());
  const [dismissed, setDismissed] = useState<boolean>(() => wasRecentlyDismissed());

  useEffect(() => {
    const onBefore = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setDeferredPrompt(null);
      setStandalone(true);
    };
    window.addEventListener('beforeinstallprompt', onBefore as EventListener);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBefore as EventListener);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return 'unavailable' as const;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    return choice.outcome;
  }, [deferredPrompt]);

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // localStorage が使えない場合は無視
    }
    setDismissed(true);
  }, []);

  const ios = isIOS();
  return {
    standalone,
    dismissed,
    canPromptInstall: deferredPrompt !== null,
    showIOSInstructions: ios && !standalone && !dismissed,
    isIOS: ios,
    promptInstall,
    dismiss,
  };
}
