import { AnimatePresence, motion } from 'framer-motion';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

// 画面最上部に表示する控えめなオフライン通知バー。
// オフライン時のみ表示し、ユーザーに「キャッシュ表示中・編集は復帰後に反映」であることを示す。
//
// pendingCount > 0 のときは「未同期 N 件」バッジを併記し、再接続時に
// 自動同期される旨を視覚的に伝える。
export function OfflineIndicator({ pendingCount = 0 }: { pendingCount?: number }) {
  const online = useOnlineStatus();

  return (
    <AnimatePresence>
      {!online && (
        <motion.div
          key="offline-indicator"
          initial={{ y: -32, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -32, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-x-0 top-0 z-50 flex items-center justify-center gap-2 bg-amber-500 px-4 py-1.5 text-xs font-medium text-amber-950 shadow-md"
          // iOS のステータスバー被りを避けるための safe-area。
          style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.375rem)' }}
          role="status"
          aria-live="polite"
        >
          <WifiOff className="h-3.5 w-3.5" />
          <span>
            オフライン中 — 保存済みのデータを表示しています
          </span>
          {pendingCount > 0 && (
            <span className="ml-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-amber-900 px-1.5 text-[10px] font-bold tabular-nums text-amber-50">
              未同期 {pendingCount}
            </span>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
