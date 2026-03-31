import { useState } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence, motion, type Easing } from "framer-motion";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppLayout } from "./components/layout/AppLayout";
import { BookList } from "./components/books/BookList";
import ShoppingListPage from "./pages/ShoppingListPage";
import NavModePage from "./pages/NavModePage";
import ToolsPage from "./pages/ToolsPage";
import MapPage from "./pages/MapPage";
import LandingPage from "./pages/LandingPage";
import Onboarding, { ONBOARDING_KEY } from "./components/Onboarding";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { AppSettingsProvider } from "./contexts/AppSettingsContext";
import { LoginPage } from "./pages/LoginPage";

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

function AuthGate() {
  const { user, loading } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(
    () => !localStorage.getItem(ONBOARDING_KEY)
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-zinc-700 border-t-zinc-300 animate-spin" />
      </div>
    );
  }

  if (!user) return <LoginPage />;

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
