import { Routes, Route } from "react-router";
import AppLayout from "./components/AppLayout";
import Dashboard from "./pages/Dashboard";
import Jobs from "./pages/Jobs";
import Companies from "./pages/Companies";
import Resume from "./pages/Resume";
import Applications from "./pages/Applications";
import Optimizer from "./pages/Optimizer";
import Scraper from "./pages/Scraper";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="*"
        element={
          <AppLayout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/jobs" element={<Jobs />} />
              <Route path="/companies" element={<Companies />} />
              <Route path="/resume" element={<Resume />} />
              <Route path="/applications" element={<Applications />} />
              <Route path="/optimizer" element={<Optimizer />} />
              <Route path="/scraper" element={<Scraper />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AppLayout>
        }
      />
    </Routes>
  );
}
