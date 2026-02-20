import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { BookList } from "./components/books/BookList";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AppLayout><BookList /></AppLayout>} />
      </Routes>
    </Router>
  );
}

export default App;
