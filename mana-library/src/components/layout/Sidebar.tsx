import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { signOut } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { Book, LogOut } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';

export const Sidebar: React.FC = () => {
  const { currentUser } = useAuth();
  const location = useLocation();

  const navItems = [
    { label: 'My Library', icon: Book, path: '/' },
  ];

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

      <div className="p-4 border-t border-gray-200 bg-gray-50/50">
        <div className="flex items-center gap-3 px-2 py-2 mb-2">
             <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold shadow-sm">
                {currentUser?.email?.[0].toUpperCase()}
             </div>
             <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">
                    {currentUser?.email?.split('@')[0]}
                </p>
                <p className="text-xs text-gray-500 truncate">
                    {currentUser?.email}
                </p>
             </div>
        </div>
        <button
          onClick={() => signOut(auth)}
          className="flex items-center gap-3 px-2 py-2 w-full text-left text-sm font-medium text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors group"
        >
          <LogOut className="h-4 w-4 text-gray-400 group-hover:text-red-500" />
          Sign out
        </button>
      </div>
    </div>
  );
};
