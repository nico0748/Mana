import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BookOpen, ShoppingBag, Map, Settings } from 'lucide-react';
import { clsx } from 'clsx';
import { motion } from 'framer-motion';

const tabs = [
  { label: '本棚',   path: '/',         icon: BookOpen   },
  { label: '買い物', path: '/shopping', icon: ShoppingBag },
  { label: 'MAP',    path: '/map',      icon: Map        },
  { label: 'ツール', path: '/tools',    icon: Settings   },
];

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  return (
    <div className="min-h-dvh bg-zinc-950 text-zinc-100">

      {/* ── Top App Bar ─────────────────────────────────── */}
      <header
        className="sticky top-0 z-30 pt-[env(safe-area-inset-top)]"
        style={{
          background: 'rgba(9,9,11,0.88)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(39,39,42,0.7)',
        }}
      >
        <div className="px-4 h-14 flex items-center justify-between">

          {/* Logo */}
          <div className="flex items-center gap-2">
            <img src="/doujin-pp.png" alt="同人++" className="w-16 h-16 rounded-xl" />
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl text-zinc-100" style={{ fontFamily: '"Reggae One", system-ui', fontWeight: 400 }}>同人++</span>
              <span className="text-[10px] font-semibold text-zinc-600 tracking-widest hidden sm:block">同人活動サポートアプリケーション</span>
            </div>
          </div>

          {/* Desktop navigation — subtle tonal pills, NOT emerald */}
          <nav className="hidden sm:flex items-center gap-0.5 p-1 rounded-full bg-zinc-900 border border-zinc-800/80">
            {tabs.map((tab) => {
              const active = isActive(tab.path);
              return (
                <Link
                  key={tab.path}
                  to={tab.path}
                  className={clsx(
                    'relative flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all duration-200',
                    active
                      ? 'text-zinc-100'
                      : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
                  )}
                >
                  {active && (
                    <motion.div
                      layoutId="activeNavPill"
                      className="absolute inset-0 rounded-full bg-zinc-700"
                      transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                    />
                  )}
                  <tab.icon className="relative h-4 w-4 flex-shrink-0" />
                  <span className="relative hidden md:inline">{tab.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      {/* ── Main content ─────────────────────────────────── */}
      <main className="min-h-[calc(100dvh-3.5rem)] pb-20 sm:pb-0">
        {children}
      </main>

      {/* ── Bottom Navigation (mobile only) ─────────────── */}
      <nav
        className="sm:hidden fixed bottom-0 inset-x-0 z-30 pb-[env(safe-area-inset-bottom)]"
        style={{
          background: 'rgba(24,24,27,0.95)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderTop: '1px solid rgba(39,39,42,0.7)',
        }}
      >
        <div className="flex items-center justify-around h-16">
          {tabs.map((tab) => {
            const active = isActive(tab.path);
            return (
              <Link
                key={tab.path}
                to={tab.path}
                className="relative flex flex-col items-center justify-center gap-0.5 flex-1 h-full"
              >
                {active && (
                  <motion.div
                    layoutId="activeBottomPill"
                    className="absolute top-2 w-14 h-8 rounded-full bg-zinc-700/80"
                    transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                  />
                )}
                <tab.icon className={clsx(
                  'relative h-5 w-5 transition-colors duration-200',
                  active ? 'text-zinc-100' : 'text-zinc-600'
                )} />
                <span className={clsx(
                  'relative text-[10px] font-medium transition-colors duration-200',
                  active ? 'text-zinc-200' : 'text-zinc-700'
                )}>
                  {tab.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
