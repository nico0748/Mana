import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { authApi } from '../lib/api';
import type { User } from '../types';

const TOKEN_KEY = 'mana-user-token';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  register: (displayName: string) => Promise<void>;
  login: (token: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [isLoading, setIsLoading] = useState(true);

  // On mount, try to restore session from stored token
  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      return;
    }
    authApi.login(token)
      .then((data) => {
        setUser(data);
        setToken(data.token);
      })
      .catch(() => {
        // Invalid token — clear it
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
      })
      .finally(() => setIsLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const register = useCallback(async (displayName: string) => {
    const data = await authApi.register(displayName);
    localStorage.setItem(TOKEN_KEY, data.token);
    setToken(data.token);
    setUser(data);
  }, []);

  const login = useCallback(async (inputToken: string) => {
    const data = await authApi.login(inputToken);
    localStorage.setItem(TOKEN_KEY, data.token);
    setToken(data.token);
    setUser(data);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      token,
      isLoading,
      isAuthenticated: !!user,
      register,
      login,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
