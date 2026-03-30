import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, LogOut, User } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

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
  const { user, logout } = useAuth();

  const accountInfo = (
    <div className="border-t border-zinc-800 pt-3 mt-1">
      <div className="flex items-center gap-2.5 px-1 mb-2">
        {user?.photoURL ? (
          <img src={user.photoURL} alt="avatar" className="w-7 h-7 rounded-full flex-shrink-0" />
        ) : (
          <div className="w-7 h-7 rounded-full bg-zinc-700 flex items-center justify-center flex-shrink-0">
            <User className="w-3.5 h-3.5 text-zinc-400" />
          </div>
        )}
        <div className="min-w-0">
          {user?.displayName && (
            <p className="text-xs font-medium text-zinc-300 truncate">{user.displayName}</p>
          )}
          <p className="text-xs text-zinc-500 truncate">{user?.email ?? ''}</p>
        </div>
      </div>
      <button
        onClick={logout}
        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
      >
        <LogOut className="w-3.5 h-3.5" />
        ログアウト
      </button>
    </div>
  );

  const inner = (
    <>
      <div className="flex-1 overflow-y-auto p-4">
        {children}
      </div>
      <div className="p-4 border-t border-zinc-800">
        {footer}
        {accountInfo}
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
                {accountInfo}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
