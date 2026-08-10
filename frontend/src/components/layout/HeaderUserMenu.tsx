import React from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { LogOut, User } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export const HeaderUserMenu: React.FC = () => {
  const { user, logout } = useAuth();
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);

  React.useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  if (!user) return null;

  const handleLogout = async () => {
    setOpen(false);
    await logout();
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        onClick={() => setOpen((v) => !v)}
        aria-label="アカウントメニュー"
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center justify-center w-9 h-9 rounded-full ring-1 ring-zinc-700 hover:ring-zinc-500 transition-colors overflow-hidden bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50"
      >
        {user.photoURL ? (
          <img src={user.photoURL} alt="avatar" className="w-full h-full object-cover" />
        ) : (
          <User className="w-4 h-4 text-zinc-300" />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute right-0 top-full mt-3 w-64 z-50"
          >
            {/* Comment-style arrow (points up to avatar) */}
            <div
              className="absolute -top-1.5 right-3 w-3 h-3 rotate-45 bg-zinc-900 border-l border-t border-zinc-800"
              aria-hidden
            />

            <div role="menu" aria-label="アカウントメニュー" className="rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl shadow-black/40 overflow-hidden">
              <Link
                to="/account"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800 hover:bg-zinc-800/60 transition-colors text-left"
                aria-label="アカウント設定を開く"
                role="menuitem"
              >
                {user.photoURL ? (
                  <img src={user.photoURL} alt="" className="w-10 h-10 rounded-full flex-shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-zinc-400" />
                  </div>
                )}
                <div className="min-w-0">
                  {user.displayName && (
                    <p className="text-sm font-medium text-zinc-100 truncate">
                      {user.displayName}
                    </p>
                  )}
                  <p className="text-xs text-zinc-500 truncate">{user.email ?? ''}</p>
                </div>
              </Link>

              <button
                onClick={handleLogout}
                role="menuitem"
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                ログアウト
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
