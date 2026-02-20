import React, { useState } from 'react';
import { Sidebar } from './Sidebar';

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50/50">
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(o => !o)} />

      {/* モバイル用バックドロップ */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 sm:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="pl-16 sm:pl-64 transition-all duration-300">
        {/* ページヘッダー */}
        <header className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-gray-200 px-4 sm:px-8 h-14 flex items-center">
          <h1 className="text-lg font-bold text-gray-900">Mana Library</h1>
        </header>

        <main className="max-w-7xl mx-auto p-4 sm:p-8 animate-in fade-in duration-500">
          {children}
        </main>
      </div>
    </div>
  );
};
