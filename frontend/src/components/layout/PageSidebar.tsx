import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';

interface PageSidebarProps {
  /** モバイルでの開閉状態 */
  open: boolean;
  onClose: () => void;
  /** サイドバー下部に固定表示するコンテンツ */
  footer: React.ReactNode;
  /** サイドバー本体コンテンツ（省略可） */
  children?: React.ReactNode;
}

export const PageSidebar: React.FC<PageSidebarProps> = ({ open, onClose, footer, children }) => {
  const inner = (
    <>
      <div className="flex-1 overflow-y-auto p-4">
        {children}
      </div>
      <div className="p-4 border-t border-zinc-800">
        {footer}
      </div>
    </>
  );

  return (
    <>
      {/* デスクトップ: 常時表示サイドバー（左側） */}
      <aside className="hidden lg:flex flex-col w-64 flex-shrink-0 border-r border-zinc-800">
        {inner}
      </aside>

      {/* モバイル: オーバーレイドロワー（左側） */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
              onClick={onClose}
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 38 }}
              className="fixed left-0 top-14 bottom-0 w-64 bg-zinc-900 border-r border-zinc-800 z-50 flex flex-col lg:hidden"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 flex-shrink-0">
                <span className="text-sm font-semibold text-zinc-200">ツール</span>
                <button
                  onClick={onClose}
                  className="p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-md transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                {children}
              </div>
              <div className="p-4 border-t border-zinc-800">
                {footer}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
