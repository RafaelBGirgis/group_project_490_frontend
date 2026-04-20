import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ClientDashboard from "./pages/client_dash";
import CoachDashboard from "./pages/coach_dash";
import AdminDashboard from "./pages/admin_dash";
import LandingPage from "./pages/landing";
import LoginPage from "./pages/login";
import ForgotPasswordPage from "./pages/forgot_password";
import SignupPage from "./pages/signup";
import ProfilePage from "./pages/profile";
import CoachRequestFormPage from "./pages/coach_request_form";
import OnboardingPage from "./pages/onboarding";

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[#080D19] text-white">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/profile" element={<ProfilePage role="client" />} />
          <Route path="/coach-request" element={<CoachRequestFormPage />} />
          <Route path="/coach-profile" element={<ProfilePage role="coach" />} />
          <Route path="/client" element={<ClientDashboard />} />
          <Route path="/coach" element={<CoachDashboard />} />
          <Route path="/admin" element={<AdminDashboard />} />
          {/* Catch-all: redirect unknown routes back to the landing page */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
