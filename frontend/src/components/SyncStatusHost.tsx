import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';
import { useOfflineSync } from '../hooks/useOfflineSync';
import { OfflineIndicator } from './OfflineIndicator';

// オフライン同期に関する UI を一手に引き受けるホスト。
//   - useOfflineSync() を 1 箇所だけで呼び出す
//   - pendingCount を OfflineIndicator に流して未同期件数を表示
//   - 同期成功時にトースト表示
//
// このコンポーネントを App ルートに 1 つだけ置けば、画面下部の sync 振る舞いは
// 全自動になる。
export function SyncStatusHost() {
  const { pendingCount, lastResult, consumeLastResult } = useOfflineSync();
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!lastResult) return;
    if (lastResult.success > 0) {
      setToastMessage(`オンラインに復帰: 変更 ${lastResult.success} 件を同期しました`);
    } else if (lastResult.dropped > 0 && lastResult.success === 0 && lastResult.failed === 0) {
      // すべて失敗（対象が消えた等）した場合のみ表示。失敗 0 件のときは黙る。
      setToastMessage(`一部の変更を同期できませんでした（${lastResult.dropped} 件をスキップ）`);
    }
    consumeLastResult();
  }, [lastResult, consumeLastResult]);

  useEffect(() => {
    if (!toastMessage) return;
    const t = setTimeout(() => setToastMessage(null), 3500);
    return () => clearTimeout(t);
  }, [toastMessage]);

  return (
    <>
      <OfflineIndicator pendingCount={pendingCount} />
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            key="sync-toast"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 left-1/2 z-40 -translate-x-1/2"
            role="status"
            aria-live="polite"
          >
            <div className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-4 py-2 text-xs font-medium text-emerald-200 shadow-lg backdrop-blur">
              <CheckCircle2 className="h-4 w-4" />
              <span>{toastMessage}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
