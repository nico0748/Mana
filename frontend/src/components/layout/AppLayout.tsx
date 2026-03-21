import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BookOpen, ShoppingBag, Map, Settings } from 'lucide-react';
import { clsx } from 'clsx';
import { motion } from 'framer-motion';

const tabs = [
  { label: '本棚',   path: '/',         icon: BookOpen  },
  { label: '買い物', path: '/shopping', icon: ShoppingBag },
  { label: 'MAP',    path: '/map',      icon: Map       },
  { label: 'ツール', path: '/tools',    icon: Settings  },
];

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  return (
    <div className="min-h-dvh bg-zinc-950 text-zinc-100">

      {/* ── Top App Bar (Material Design) ───────────────── */}
      <header className="sticky top-0 z-30 pt-[env(safe-area-inset-top)]"
        style={{ background: 'rgba(9,9,11,0.92)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(39,39,42,0.8)' }}>
        <div className="px-4 h-14 flex items-center justify-between">

          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 bg-emerald-500 rounded-xl shadow-md shadow-emerald-900/50">
              <BookOpen className="w-4 h-4 text-zinc-950" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold tracking-tight text-zinc-100">KuraMori</span>
              <span className="text-[10px] font-semibold text-zinc-500 tracking-widest hidden sm:block">くらもり</span>
            </div>
          </div>

          {/* Desktop navigation */}
          <nav className="hidden sm:flex items-center gap-1 p-1 rounded-full bg-zinc-900 border border-zinc-800">
            {tabs.map((tab) => {
              const active = isActive(tab.path);
              return (
                <Link
                  key={tab.path}
                  to={tab.path}
                  className={clsx(
                    'relative flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all duration-200',
                    active
                      ? 'text-zinc-950'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                  )}
                >
                  {active && (
                    <motion.div
                      layoutId="activeNavPill"
                      className="absolute inset-0 rounded-full bg-emerald-500"
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

      {/* ── Main content ────────────────────────────────── */}
      <main className="min-h-[calc(100dvh-3.5rem)] pb-20 sm:pb-0">
        {children}
      </main>

      {/* ── Bottom Navigation Bar (mobile only, Material Design) ── */}
      <nav className="sm:hidden fixed bottom-0 inset-x-0 z-30 pb-[env(safe-area-inset-bottom)]"
        style={{ background: 'rgba(24,24,27,0.96)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderTop: '1px solid rgba(39,39,42,0.8)' }}>
        <div className="flex items-center justify-around h-16">
          {tabs.map((tab) => {
            const active = isActive(tab.path);
            return (
              <Link
                key={tab.path}
                to={tab.path}
                className="relative flex flex-col items-center justify-center gap-0.5 flex-1 h-full"
              >
                {/* Active indicator pill */}
                {active && (
                  <motion.div
                    layoutId="activeBottomPill"
                    className="absolute top-2 w-14 h-8 rounded-full bg-emerald-500/15"
                    transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                  />
                )}
                <tab.icon className={clsx(
                  'relative h-5 w-5 transition-colors duration-200',
                  active ? 'text-emerald-400' : 'text-zinc-500'
                )} />
                <span className={clsx(
                  'relative text-[10px] font-medium transition-colors duration-200',
                  active ? 'text-emerald-400' : 'text-zinc-600'
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
