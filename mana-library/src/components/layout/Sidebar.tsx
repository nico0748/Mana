import React, { useRef } from 'react';
import { Book, Download, Upload } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';
import { useSync } from '../../hooks/useSync';

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const { exportBooks, importBooks } = useSync();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const navItems = [
    { label: 'My Library', icon: Book, path: '/' },
  ];

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await importBooks(file);
    } catch (err) {
      console.error('Import failed:', err);
      alert('Failed to import data. Please check the file format.');
    } finally {
      e.target.value = '';
    }
  };

  return (
    <div className="w-64 bg-white border-r border-gray-200 h-screen flex flex-col fixed left-0 top-0">
      <div className="p-6 flex items-center gap-2">
        <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Book className="h-5 w-5 text-white" />
        </div>
        <h1 className="text-xl font-bold text-gray-900 tracking-tight">
            Mana Library
        </h1>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={clsx(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
              location.pathname === item.path
                ? "bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-200"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            )}
          >
            <item.icon className={clsx("h-5 w-5", location.pathname === item.path ? "text-blue-600" : "text-gray-400 group-hover:text-gray-500")} />
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-200 bg-gray-50/50 space-y-2">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 mb-1">Sync</p>
        <button
          onClick={exportBooks}
          className="flex items-center gap-3 px-2 py-2 w-full text-left text-sm font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
        >
          <Download className="h-4 w-4 text-gray-400" />
          Export JSON
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-3 px-2 py-2 w-full text-left text-sm font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
        >
          <Upload className="h-4 w-4 text-gray-400" />
          Import JSON
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={handleImport}
        />
      </div>
    </div>
  );
};
