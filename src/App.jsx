import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ClientDashboard from "./pages/client_dash";
import CoachDashboard from "./pages/coach_dash";
import AdminDashboard from "./pages/admin_dash";
import LandingPage from "./pages/landing";
import LoginPage from "./pages/login";
import SignupPage from "./pages/signup";
import DeactivatedPage from "./pages/deactivated";
import ProfilePage from "./pages/profile";
import CoachRequestFormPage from "./pages/coach_request_form";
import OnboardingPage from "./pages/onboarding";
import ChatPage from "./pages/chat";
import MessagesPage from "./pages/messages";
import FindCoachPage from "./pages/find_coach";
import PlanMyWeekPage from "./pages/plan_my_week";
import CoachPublicProfilePage from "./pages/coach_public_profile";
import AvailabilityPage from "./pages/availability";

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[#080D19] text-white">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/deactivated" element={<DeactivatedPage />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/profile" element={<ProfilePage role="client" />} />
          <Route path="/coach-request" element={<CoachRequestFormPage />} />
          <Route path="/coach-profile" element={<ProfilePage role="coach" />} />
          <Route path="/client" element={<ClientDashboard />} />
          <Route path="/coach" element={<CoachDashboard />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/messages" element={<MessagesPage />} />
          {/* Legacy role-split URLs redirect to the unified page, preserving query params (e.g. ?account=). */}
          <Route path="/client/messages" element={<MessagesPage />} />
          <Route path="/coach/messages" element={<MessagesPage />} />
          <Route path="/client-chat" element={<Navigate to="/messages" replace />} />
          <Route path="/coach-chat" element={<Navigate to="/messages" replace />} />
          <Route path="/find-coach" element={<FindCoachPage />} />
          <Route path="/coaches/:coachId" element={<CoachPublicProfilePage />} />
          <Route path="/plan-my-week" element={<PlanMyWeekPage />} />
          <Route path="/plan" element={<Navigate to="/plan-my-week" replace />} />
          <Route path="/workouts" element={<Navigate to="/plan-my-week" replace />} />
          <Route path="/availability" element={<AvailabilityPage />} />
          {/* Catch-all: redirect unknown routes back to the landing page */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
