import { Route, Routes } from "react-router";
import { Layout } from "./components/Layout";
import { PatientPage } from "./pages/PatientPage";
import { SearchPage } from "./pages/SearchPage";

export function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<SearchPage />} />
        <Route path="/patients/:id" element={<PatientPage />} />
        <Route path="*" element={<p className="text-sm text-slate-500">Page not found.</p>} />
      </Routes>
    </Layout>
  );
}
