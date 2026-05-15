import { useEffect, useState } from 'react';

// オンライン/オフラインを検出するフック。
// navigator.onLine だけだと不正確なケースがある（VPN・キャプティブポータル等）が、
// 「会場の地下で電波がない」程度のシナリオでは十分実用的。
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState<boolean>(() => {
    if (typeof navigator === 'undefined') return true;
    return navigator.onLine;
  });

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return online;
}
