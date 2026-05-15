import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { type User, onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { clearQueryPersistedCache } from '../lib/queryClient';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
  pendingTerms: boolean;
  setPendingTerms: (v: boolean) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  logout: async () => {},
  pendingTerms: false,
  setPendingTerms: () => {},
  refreshUser: async () => {},
});

// 直近にログインしていた UID を覚えておくキー。
// 別ユーザーがログインしてきたとき、前ユーザーの永続キャッシュをそのまま使わせない目的。
const LAST_UID_KEY = 'doujin-pp-last-uid';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingTerms, setPendingTerms] = useState(false);
  // useEffect の dep にせず、ref で「前回の uid」を保持する。
  const prevUidRef = useRef<string | null>(null);

  useEffect(() => {
    // 初期化時、永続化された前回 UID を読み出して seed する。
    try {
      prevUidRef.current = localStorage.getItem(LAST_UID_KEY);
    } catch {
      prevUidRef.current = null;
    }

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      const currentUid = u?.uid ?? null;
      const prevUid = prevUidRef.current;

      // UID が変わった（別ユーザーのログイン or ログアウト）場合、
      // 前ユーザーの React Query 永続キャッシュを破棄する。データ越境防止。
      if (prevUid !== currentUid) {
        clearQueryPersistedCache().catch(() => {
          // クリア失敗は致命的でない（次回ログイン時に上書きされる）
        });
        try {
          if (currentUid) {
            localStorage.setItem(LAST_UID_KEY, currentUid);
          } else {
            localStorage.removeItem(LAST_UID_KEY);
          }
        } catch {
          // localStorage 不可環境では諦める
        }
        prevUidRef.current = currentUid;
      }

      setUser(u);
      // ログアウト・アカウント削除時に pending 状態をリセット
      if (!u) setPendingTerms(false);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const logout = () => signOut(auth);

  const refreshUser = async () => {
    await auth.currentUser?.reload();
    setUser(auth.currentUser);
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout, pendingTerms, setPendingTerms, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
