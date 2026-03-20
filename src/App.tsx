import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence, motion, type Easing } from "framer-motion";
import { AppLayout } from "./components/layout/AppLayout";
import { BookList } from "./components/books/BookList";
import ShoppingListPage from "./pages/ShoppingListPage";
import NavModePage from "./pages/NavModePage";
import CashRegisterPage from "./pages/CashRegisterPage";
import ToolsPage from "./pages/ToolsPage";

const easeOut: Easing = 'easeOut';

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.2, ease: easeOut } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15 } },
};

/**
 * Renders the application's routes with coordinated enter/exit animations.
 *
 * Each route is keyed by the current pathname so navigations trigger remounts and play the defined transitions.
 *
 * @returns A JSX element that contains the app routes wrapped for animated transitions using AnimatePresence and motion containers.
 */
function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<motion.div {...pageVariants}><BookList /></motion.div>} />
        <Route path="/shopping" element={<motion.div {...pageVariants}><ShoppingListPage /></motion.div>} />
        <Route path="/shopping/nav" element={<motion.div {...pageVariants}><NavModePage /></motion.div>} />
        <Route path="/register" element={<motion.div {...pageVariants}><CashRegisterPage /></motion.div>} />
        <Route path="/tools" element={<motion.div {...pageVariants}><ToolsPage /></motion.div>} />
      </Routes>
    </AnimatePresence>
  );
}

/**
 * Root application component that initializes client-side routing and renders the top-level layout with animated route content.
 *
 * @returns The app's root React element containing the router, application layout, and animated routes.
 */
function App() {
  return (
    <Router>
      <AppLayout>
        <AnimatedRoutes />
      </AppLayout>
    </Router>
  );
}

export default App;
