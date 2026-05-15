import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { flushQueue, getQueueCount, type FlushResult } from '../lib/mutationQueue';
import { queryClient } from '../lib/queryClient';
import { useOnlineStatus } from './useOnlineStatus';

// オフライン中に溜まったミューテーションをオンライン復帰時に自動同期するフック。
//
// 役割:
//   1. pendingCount を提供（UI バッジ用）
//   2. online イベントで自動 flush
//   3. アプリ起動時にも一度 flush を試みる（前回終了時の残骸を解消）
//   4. 成功した場合は React Query を invalidate して、サーバの正規データに揃える
//   5. 同期結果（成功/失敗件数）を最後の結果として保持し、トースト用に公開
export function useOfflineSync() {
  const { user } = useAuth();
  const online = useOnlineStatus();
  const [pendingCount, setPendingCount] = useState(0);
  const [lastResult, setLastResult] = useState<FlushResult | null>(null);

  const refreshPending = useCallback(async () => {
    if (!user) {
      setPendingCount(0);
      return;
    }
    try {
      setPendingCount(await getQueueCount(user.uid));
    } catch {
      // IDB I/O 失敗時は前回値を維持
    }
  }, [user]);

  const sync = useCallback(async () => {
    if (!user || !navigator.onLine) return;
    const result = await flushQueue(user.uid);
    if (result.success > 0 || result.dropped > 0 || result.failed > 0) {
      setLastResult(result);
    }
    if (result.success > 0) {
      // 楽観的更新でローカルは既に正しいが、サーバの updatedAt 等を取得し直す。
      queryClient.invalidateQueries({ queryKey: ['circles'] });
      queryClient.invalidateQueries({ queryKey: ['circleItems'] });
    }
    await refreshPending();
  }, [user, refreshPending]);

  // user 変更時 + オンライン状態変化時に pending を再集計
  useEffect(() => {
    refreshPending();
  }, [refreshPending, online]);

  // オンライン状態 / user の変化に追従して sync をキック
  useEffect(() => {
    if (!user) return;
    if (!online) return;
    // online になった瞬間、または既に online で user が確定したタイミングで実行。
    sync();
  }, [online, user, sync]);

  // 他タブ/ページからキューが変動する可能性は薄いが、フォーカス時に再集計しておく。
  useEffect(() => {
    const onFocus = () => {
      refreshPending();
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refreshPending]);

  const consumeLastResult = useCallback(() => {
    setLastResult(null);
  }, []);

  return {
    pendingCount,
    lastResult,
    sync,
    consumeLastResult,
  };
}
