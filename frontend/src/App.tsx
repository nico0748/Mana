import { useState } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence, motion, type Easing } from "framer-motion";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { updateProfile } from "firebase/auth";
import { AppLayout } from "./components/layout/AppLayout";
import { BookList } from "./components/books/BookList";
import ShoppingListPage from "./pages/ShoppingListPage";
import NavModePage from "./pages/NavModePage";
import ToolsPage from "./pages/ToolsPage";
import MapPage from "./pages/MapPage";
import LandingPage from "./pages/LandingPage";
import TemplatesPage from "./pages/TemplatesPage";
import Onboarding, { ONBOARDING_KEY } from "./components/Onboarding";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { AppSettingsProvider } from "./contexts/AppSettingsContext";
import { LoginPage, SocialTermsModal } from "./pages/LoginPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,
      retry: 1,
    },
  },
});

const easeOut: Easing = 'easeOut';

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.2, ease: easeOut } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15 } },
};

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<motion.div {...pageVariants}><BookList /></motion.div>} />
        <Route path="/shopping" element={<motion.div {...pageVariants}><ShoppingListPage /></motion.div>} />
        <Route path="/shopping/nav" element={<motion.div {...pageVariants}><NavModePage /></motion.div>} />
        <Route path="/tools" element={<motion.div {...pageVariants}><ToolsPage /></motion.div>} />
        <Route path="/map" element={<motion.div {...pageVariants}><MapPage /></motion.div>} />
      </Routes>
    </AnimatePresence>
  );
}

// ─── ユーザー名設定モーダル（ソーシャル新規登録時） ──────────────────────────

function UsernameSetupModal({ onComplete }: { onComplete: () => void }) {
  const { user, refreshUser } = useAuth();
  const [name, setName] = useState(user?.displayName ?? '');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !user) return;
    setSaving(true);
    try {
      await updateProfile(user, { displayName: name.trim() });
      await refreshUser();
      onComplete();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-zinc-900 rounded-2xl border border-zinc-800 p-6 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-zinc-100 mb-1">ユーザー名の設定</h2>
          <p className="text-xs text-zinc-500">アプリ内で表示される名前を設定してください</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="ユーザー名"
            maxLength={30}
            required
            autoFocus
            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-500"
          />
          <button
            type="submit"
            disabled={!name.trim() || saving}
            className="w-full py-2.5 bg-zinc-100 hover:bg-white text-zinc-900 font-semibold text-sm rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? '保存中...' : '設定する'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── AuthGate ─────────────────────────────────────────────────────────────────

function AuthGate() {
  const { user, loading, pendingTerms, setPendingTerms } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(
    () => !localStorage.getItem(ONBOARDING_KEY)
  );
  const [showUsernameSetup, setShowUsernameSetup] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-zinc-700 border-t-zinc-300 animate-spin" />
      </div>
    );
  }

  if (!user) return <LoginPage />;

  // 新規ソーシャルログイン → 利用規約同意
  if (pendingTerms) {
    return (
      <SocialTermsModal
        onAgree={() => {
          setPendingTerms(false);
          setShowUsernameSetup(true);
        }}
        onCancel={async () => {
          await user.delete().catch(() => {});
          // user が null になると AuthContext が pendingTerms を自動リセット
        }}
      />
    );
  }

  // 利用規約同意後 → ユーザー名設定
  if (showUsernameSetup) {
    return <UsernameSetupModal onComplete={() => setShowUsernameSetup(false)} />;
  }

  const handleOnboardingComplete = () => {
    localStorage.setItem(ONBOARDING_KEY, '1');
    setShowOnboarding(false);
  };

  return (
    <>
      {showOnboarding && <Onboarding onComplete={handleOnboardingComplete} />}
      <AppLayout>
        <AnimatedRoutes />
      </AppLayout>
    </>
  );
}

function AppRoot() {
  return (
    <Routes>
      <Route path="/about" element={<LandingPage />} />
      <Route path="/templates" element={<TemplatesPage />} />
      <Route path="/*" element={<AuthGate />} />
    </Routes>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppSettingsProvider>
          <Router>
            <AppRoot />
          </Router>
        </AppSettingsProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
