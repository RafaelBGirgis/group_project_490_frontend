import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ClientDashboard from "./pages/client_dash";
import CoachDashboard from "./pages/coach_dash";
import AdminDashboard from "./pages/admin_dash";
import LandingPage from "./pages/landing";
import LoginPage from "./pages/login";
import SignupPage from "./pages/signup";
import ProfilePage from "./pages/profile";
import CoachRequestFormPage from "./pages/coach_request_form";
import OnboardingPage from "./pages/onboarding";
import ChatPage from "./pages/chat";
import CoachChatPage from "./pages/coach_chat";
import ClientChatPage from "./pages/client_chat";
import FindCoachPage from "./pages/find_coach";
import WorkoutsPage from "./pages/workouts";
import CoachPublicProfilePage from "./pages/coach_public_profile";

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[#080D19] text-white">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/profile" element={<ProfilePage role="client" />} />
          <Route path="/coach-request" element={<CoachRequestFormPage />} />
          <Route path="/coach-profile" element={<ProfilePage role="coach" />} />
          <Route path="/client" element={<ClientDashboard />} />
          <Route path="/coach" element={<CoachDashboard />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/coach-chat" element={<CoachChatPage />} />
          <Route path="/client-chat" element={<ClientChatPage />} />
          <Route path="/client/messages" element={<ChatPage />} />
          <Route path="/coach/messages" element={<ChatPage />} />
          <Route path="/find-coach" element={<FindCoachPage />} />
          <Route path="/coaches/:coachId" element={<CoachPublicProfilePage />} />
          <Route path="/workouts" element={<WorkoutsPage />} />
          {/* Catch-all: redirect unknown routes back to the landing page */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
