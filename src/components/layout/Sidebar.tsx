import React, { useRef } from 'react';
import { Book, Download, Upload, Share2, ChevronRight, ChevronLeft } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';
import { useSync, isShareSupported } from '../../hooks/useSync';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onToggle }) => {
  const location = useLocation();
  const { exportBooks, importBooks } = useSync();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const navItems = [
    { label: 'Mana Library', icon: Book, path: '/' },
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

  const expanded = isOpen; // モバイルで展開中か

  return (
    <div
      className={clsx(
        'bg-white border-r border-gray-200 h-dvh flex flex-col fixed left-0 top-0 z-30 transition-all duration-300',
        // デスクトップは常に w-64
        'sm:w-64',
        // モバイルは isOpen で切り替え
        expanded ? 'w-64 shadow-xl' : 'w-16',
      )}
    >
      {/* ロゴ + モバイル展開トグル */}
      <div className="flex items-center justify-between px-3 sm:px-6 h-14 border-b border-gray-100">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-8 w-8 flex-shrink-0 bg-blue-600 rounded-lg flex items-center justify-center">
            <Book className="h-5 w-5 text-white" />
          </div>
          <h1 className={clsx(
            'text-lg font-bold text-gray-900 tracking-tight truncate transition-all duration-200',
            expanded ? 'opacity-100 w-auto' : 'opacity-0 w-0 overflow-hidden',
            'sm:opacity-100 sm:w-auto sm:overflow-visible',
          )}>
            Mana
          </h1>
        </div>

        {/* モバイルのみ表示するトグルボタン */}
        <button
          onClick={onToggle}
          className="sm:hidden flex-shrink-0 p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          aria-label={expanded ? 'サイドバーを閉じる' : 'サイドバーを開く'}
        >
          {expanded
            ? <ChevronLeft className="h-5 w-5" />
            : <ChevronRight className="h-5 w-5" />
          }
        </button>
      </div>

      {/* ナビ */}
      <nav className="flex-1 px-2 sm:px-4 py-3 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            title={item.label}
            className={clsx(
              'flex items-center gap-3 px-2 sm:px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
              expanded ? 'justify-start' : 'justify-center sm:justify-start',
              location.pathname === item.path
                ? 'bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-200'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
            )}
          >
            <item.icon className={clsx(
              'h-5 w-5 flex-shrink-0',
              location.pathname === item.path ? 'text-blue-600' : 'text-gray-400',
            )} />
            <span className={clsx(
              'transition-all duration-200',
              expanded ? 'opacity-100 w-auto' : 'opacity-0 w-0 overflow-hidden',
              'sm:opacity-100 sm:w-auto sm:overflow-visible',
            )}>
              {item.label}
            </span>
          </Link>
        ))}
      </nav>

      {/* 同期 */}
      <div className="p-2 sm:p-4 pb-[calc(0.5rem+env(safe-area-inset-bottom))] sm:pb-[calc(1rem+env(safe-area-inset-bottom))] border-t border-gray-200 bg-gray-50/50 space-y-1">
        <p className={clsx(
          'text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 mb-1 transition-all duration-200',
          expanded ? 'opacity-100 h-auto' : 'opacity-0 h-0 overflow-hidden',
          'sm:opacity-100 sm:h-auto sm:overflow-visible',
        )}>
          Sync
        </p>

        <button
          onClick={exportBooks}
          title={isShareSupported ? 'Share' : 'Export JSON'}
          className={clsx(
            'flex items-center gap-3 px-2 py-2 w-full text-sm font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors',
            expanded ? 'justify-start' : 'justify-center sm:justify-start',
          )}
        >
          {isShareSupported
            ? <Share2 className="h-4 w-4 flex-shrink-0 text-gray-400" />
            : <Download className="h-4 w-4 flex-shrink-0 text-gray-400" />
          }
          <span className={clsx(
            expanded ? 'opacity-100 w-auto' : 'opacity-0 w-0 overflow-hidden',
            'sm:opacity-100 sm:w-auto sm:overflow-visible',
          )}>
            {isShareSupported ? 'Share' : 'Export JSON'}
          </span>
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          title="Import JSON"
          className={clsx(
            'flex items-center gap-3 px-2 py-2 w-full text-sm font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors',
            expanded ? 'justify-start' : 'justify-center sm:justify-start',
          )}
        >
          <Upload className="h-4 w-4 flex-shrink-0 text-gray-400" />
          <span className={clsx(
            expanded ? 'opacity-100 w-auto' : 'opacity-0 w-0 overflow-hidden',
            'sm:opacity-100 sm:w-auto sm:overflow-visible',
          )}>
            Import JSON
          </span>
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
