import React from "react";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../ui/Button";
import { signOut } from "firebase/auth";
import { auth } from "../../lib/firebase";

export const Header: React.FC = () => {
  const { currentUser } = useAuth();

  return (
    <header className="bg-white shadow-sm sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex-shrink-0 flex items-center">
            <h1 className="text-xl font-bold text-blue-600">Mana Library</h1>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-500 hidden sm:inline-block">{currentUser?.email}</span>
            <Button variant="outline" size="sm" onClick={() => signOut(auth)}>
              Logout
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};
