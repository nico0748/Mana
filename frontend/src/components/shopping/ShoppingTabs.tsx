import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingBag, CheckCircle2, Globe } from 'lucide-react';

const tabs = [
  { path: '/shopping',             label: 'リスト',     icon: ShoppingBag  },
  { path: '/shopping/purchased',   label: '購入済み',   icon: CheckCircle2 },
  { path: '/shopping/unavailable', label: '通販確認',   icon: Globe        },
];

export const ShoppingTabs: React.FC = () => {
  const { pathname } = useLocation();
  return (
    <nav className="flex gap-0.5 p-1 bg-zinc-900 rounded-full border border-zinc-800/80 w-fit">
      {tabs.map(t => {
        const active = pathname === t.path;
        return (
          <Link
            key={t.path}
            to={t.path}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              active
                ? 'bg-zinc-700 text-zinc-100'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
            }`}
          >
            <t.icon className="w-3.5 h-3.5" />
            <span className="hidden xs:inline sm:inline">{t.label}</span>
          </Link>
        );
      })}
    </nav>
  );
};
