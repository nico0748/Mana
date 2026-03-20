import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BookOpen, ShoppingBag, Calculator, Settings } from 'lucide-react';
import { clsx } from 'clsx';
import { motion } from 'framer-motion';

const tabs = [
  { label: '本棚', path: '/', icon: BookOpen },
  { label: '買い物', path: '/shopping', icon: ShoppingBag },
  { label: 'レジ', path: '/register', icon: Calculator },
  { label: 'ツール', path: '/tools', icon: Settings },
];

export const BottomNav: React.FC = () => {
  const location = useLocation();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-zinc-900 border-t border-zinc-800 pb-[env(safe-area-inset-bottom)]">
      <div className="flex max-w-lg mx-auto">
        {tabs.map((tab) => {
          const isActive = tab.path === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(tab.path);
          return (
            <Link key={tab.path} to={tab.path} className="flex-1 flex flex-col items-center justify-center py-3 gap-1 relative min-h-[56px]">
              {isActive && (
                <motion.div
                  layoutId="activeTabIndicator"
                  className="absolute top-0 left-2 right-2 h-0.5 bg-yellow-400 rounded-full"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
              <tab.icon className={clsx('h-5 w-5', isActive ? 'text-yellow-400' : 'text-zinc-500')} />
              <span className={clsx('text-xs font-medium', isActive ? 'text-yellow-400' : 'text-zinc-500')}>
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
