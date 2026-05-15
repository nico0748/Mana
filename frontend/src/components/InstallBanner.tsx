import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Download, X, Share } from 'lucide-react';
import { useInstallPrompt } from '../hooks/useInstallPrompt';

// 「ホーム画面に追加しませんか？」バナー。
// - Android / デスクトップ Chrome 系: beforeinstallprompt をフックしてネイティブの
//   インストールダイアログを呼び出す。
// - iOS Safari: beforeinstallprompt が無いため、共有ボタン → ホーム画面に追加
//   の手順案内を出す。
// - 既にインストール済 / 直近で dismiss 済の場合は表示しない。
export function InstallBanner() {
  const {
    standalone,
    dismissed,
    canPromptInstall,
    showIOSInstructions,
    isIOS,
    promptInstall,
    dismiss,
  } = useInstallPrompt();

  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // 既に PWA で起動中、または直近 7 日以内に dismiss されているなら何も出さない。
  if (standalone || dismissed) return null;

  // Android Chrome 等の prompt が呼べる場合 OR iOS の案内可能な場合のみ表示。
  const visible = canPromptInstall || showIOSInstructions;
  if (!visible) return null;

  const handleInstall = async () => {
    if (canPromptInstall) {
      await promptInstall();
    } else if (isIOS) {
      setShowIOSGuide(true);
    }
  };

  return (
    <>
      <AnimatePresence>
        <motion.div
          key="install-banner"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.2 }}
          className="fixed bottom-4 left-4 right-4 z-40 mx-auto max-w-md"
          // 下部ナビ等とぶつかる端末向けの余白。iOS ホームインジケータも考慮。
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div className="flex items-start gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/95 p-4 shadow-xl backdrop-blur">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-100">
              <Download className="h-5 w-5 text-zinc-900" />
            </div>
            <div className="flex-1 space-y-2">
              <div>
                <p className="text-sm font-semibold text-zinc-100">
                  ホーム画面に追加しませんか？
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-zinc-400">
                  オフラインでも起動でき、即売会会場のような電波の弱い場所でも
                  快適に使えます。
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleInstall}
                  className="rounded-lg bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-zinc-900 transition-colors hover:bg-white"
                >
                  {isIOS ? '追加方法を見る' : 'ホーム画面に追加'}
                </button>
                <button
                  type="button"
                  onClick={dismiss}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
                >
                  あとで
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={dismiss}
              aria-label="閉じる"
              className="-mr-1 -mt-1 shrink-0 rounded-lg p-1 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      </AnimatePresence>

      {showIOSGuide && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setShowIOSGuide(false)}
        >
          <div
            className="w-full max-w-sm space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-6"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-100">
                <Download className="h-5 w-5 text-zinc-900" />
              </div>
              <h2 className="text-base font-semibold text-zinc-100">
                ホーム画面に追加する
              </h2>
            </div>
            <ol className="space-y-3 text-sm text-zinc-300">
              <li className="flex items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-xs font-bold text-zinc-300">
                  1
                </span>
                <span className="flex flex-wrap items-center gap-1">
                  画面下部の
                  <Share className="inline h-4 w-4 text-sky-400" aria-label="共有" />
                  共有ボタンをタップ
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-xs font-bold text-zinc-300">
                  2
                </span>
                <span>「ホーム画面に追加」を選択</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-xs font-bold text-zinc-300">
                  3
                </span>
                <span>右上の「追加」をタップして完了</span>
              </li>
            </ol>
            <p className="text-xs leading-relaxed text-zinc-500">
              Safari でアクセスしている場合のみ追加できます。Chrome 等の他ブラウザを
              ご利用の場合は、Safari で開き直してください。
            </p>
            <button
              type="button"
              onClick={() => setShowIOSGuide(false)}
              className="w-full rounded-lg bg-zinc-100 py-2.5 text-sm font-semibold text-zinc-900 transition-colors hover:bg-white"
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </>
  );
}
