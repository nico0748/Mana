import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BookOpen, ShoppingBag, Map, Settings } from 'lucide-react';
import { clsx } from 'clsx';
import { motion } from 'framer-motion';

const tabs = [
  { label: '本棚', path: '/', icon: BookOpen },
  { label: '買い物', path: '/shopping', icon: ShoppingBag },
  { label: 'MAP', path: '/map', icon: Map },
  { label: 'ツール', path: '/tools', icon: Settings },
];

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();

  return (
    <div className="min-h-dvh bg-zinc-950 text-zinc-100">
      <header className="sticky top-0 z-30 bg-zinc-900/95 backdrop-blur border-b border-zinc-800 pt-[env(safe-area-inset-top)]">
        {/* アプリ名 + ナビゲーションを1行にまとめる */}
        <div className="px-4 h-14 flex items-center justify-between">
          {/* ロゴ */}
          <div className="flex items-center gap-2.5">
            <span className="w-1 h-6 bg-emerald-500 rounded-full" />
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold tracking-tight text-zinc-100">KuraMori</span>
              <span className="text-[10px] font-medium text-zinc-500 tracking-widest hidden sm:block">くらもり</span>
            </div>
          </div>

          {/* ナビゲーション */}
          <nav className="flex items-center gap-1">
            {tabs.map((tab) => {
              const isActive = tab.path === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(tab.path);
              return (
                <Link
                  key={tab.path}
                  to={tab.path}
                  className={clsx(
                    'relative flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                    isActive
                      ? 'text-emerald-500 bg-emerald-500/10'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeNavBg"
                      className="absolute inset-0 rounded-md bg-emerald-500/10"
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  )}
                  <tab.icon className="h-4 w-4 flex-shrink-0" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="min-h-[calc(100dvh-3.5rem)]">
        {children}
      </main>
    </div>
  );
};
