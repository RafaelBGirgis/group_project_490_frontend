import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ClientDashboard from "./pages/client_dash";
import CoachDashboard from "./pages/coach_dash";
import AdminDashboard from "./pages/admin_dash";

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[#080D19] text-white">
        <Routes>
          <Route path="/" element={<Navigate to="/client" />} />
          <Route path="/client" element={<ClientDashboard />} />
          <Route path="/coach" element={<CoachDashboard />} />
          <Route path="/admin" element={<AdminDashboard />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
