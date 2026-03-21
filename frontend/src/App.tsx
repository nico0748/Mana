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
import Onboarding, { ONBOARDING_KEY } from "./components/Onboarding";

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

/**
 * Renders the application's route tree and coordinates page enter/exit animations.
 *
 * Uses the current location to ensure route changes remount pages and to drive
 * AnimatePresence-based transitions for each routed page.
 *
 * @returns A React element containing the app routes wrapped with animated page containers.
 */
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

/**
 * Root application component that provides routing, React Query configuration, and conditional onboarding.
 *
 * Initializes onboarding visibility from localStorage using `ONBOARDING_KEY`. While onboarding is shown,
 * renders the `Onboarding` component; when onboarding completes it writes `'1'` to `localStorage` under
 * `ONBOARDING_KEY` and hides the onboarding UI.
 *
 * @returns The top-level JSX element containing the `QueryClientProvider`, `Router`, application layout, and routes.
 */
function App() {
  const [showOnboarding, setShowOnboarding] = useState(
    () => !localStorage.getItem(ONBOARDING_KEY)
  );

  const handleOnboardingComplete = () => {
    localStorage.setItem(ONBOARDING_KEY, '1');
    setShowOnboarding(false);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        {showOnboarding && <Onboarding onComplete={handleOnboardingComplete} />}
        <AppLayout>
          <AnimatedRoutes />
        </AppLayout>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
