import React from 'react';
import { BottomNav } from './BottomNav';
import { useLocation } from 'react-router-dom';

const pageTitles: Record<string, string> = {
  '/': '本棚',
  '/shopping': '買い物リスト',
  '/shopping/nav': 'ナビモード',
  '/register': 'レジ',
  '/tools': 'ツール',
};

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const title = pageTitles[location.pathname] ?? 'Mana Library';

  return (
    <div className="min-h-dvh bg-zinc-950 text-zinc-100">
      <header className="sticky top-0 z-30 bg-zinc-900/95 backdrop-blur border-b border-zinc-800 px-4 h-14 flex items-center pt-[env(safe-area-inset-top)]">
        <div className="flex items-center gap-2">
          <span className="w-2 h-6 bg-yellow-400 rounded-full" />
          <h1 className="text-base font-bold tracking-tight">{title}</h1>
        </div>
      </header>
      <main className="pb-[calc(4rem+env(safe-area-inset-bottom))] min-h-[calc(100dvh-3.5rem)]">
        {children}
      </main>
      <BottomNav />
    </div>
  );
};
