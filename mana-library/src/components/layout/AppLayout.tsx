import React from 'react';
import { Sidebar } from './Sidebar';

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50/50">
      <Sidebar />
      <div className="pl-16 sm:pl-64 transition-all duration-300">
        <main className="max-w-7xl mx-auto p-8 animate-in fade-in duration-500">
            {children}
        </main>
      </div>
    </div>
  );
};
