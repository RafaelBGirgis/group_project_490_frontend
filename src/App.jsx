import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, Outlet, useNavigate, useLocation } from "react-router-dom";
import ClientDashboard from "./pages/client_dash";
import CoachDashboard from "./pages/coach_dash";
import AdminDashboard from "./pages/admin_dash";
import LandingPage from "./pages/landing";
import LoginPage from "./pages/login";
import SignupPage from "./pages/signup";
import DeactivatedPage from "./pages/deactivated";
import SuspendedPage from "./pages/suspended";
import ProfilePage from "./pages/profile";
import CoachRequestFormPage from "./pages/coach_request_form";
import OnboardingPage from "./pages/onboarding";
import ChatPage from "./pages/chat";
import MessagesPage from "./pages/messages";
import FindCoachPage from "./pages/find_coach";
import PlanMyWeekPage from "./pages/plan_my_week";
import CoachPublicProfilePage from "./pages/coach_public_profile";
import AvailabilityPage from "./pages/availability";
import { getToken, fetchAuthRoles } from "./api/auth";

const POLL_INTERVAL_MS = 30_000; // 30 seconds

/**
 * Shared role-check logic. Navigates to /suspended or /deactivated if the
 * server reports that status. Called on every navigation AND on a timer so
 * mid-session suspensions are caught even without a route change.
 */
async function checkRoles(navigate) {
  try {
    const roles = await fetchAuthRoles();
    if (!Array.isArray(roles)) return;
    if (roles.some((r) => String(r).toLowerCase().includes("suspended"))) {
      navigate("/suspended", { replace: true });
    } else if (roles.some((r) => String(r).toLowerCase().includes("deactivated"))) {
      navigate("/deactivated", { replace: true });
    }
  } catch {
    // 401 / network error — let the individual page's own auth guard handle it.
  }
}

/**
 * Layout-route guard — rendered as a parent route, renders <Outlet /> for
 * any child route. Routes declared *outside* this wrapper (i.e. /deactivated,
 * /suspended) are never subject to the check.
 *
 * Two triggers:
 *   1. Every navigation (location.pathname change) — catches deactivation on
 *      any page visit.
 *   2. A 30-second background poll — catches mid-session suspensions imposed
 *      by an admin while the user is already logged in.
 *
 * Skips if there is no token (unauthenticated users can't be suspended).
 */
function DeactivatedGuard() {
  const navigate = useNavigate();
  const location = useLocation();

  // 1. Check on every navigation
  useEffect(() => {
    if (!getToken()) return;
    checkRoles(navigate);
  }, [location.pathname, navigate]);

  // 2. Poll every 30 s while the tab is open
  useEffect(() => {
    if (!getToken()) return; // no session at mount → skip polling
    const id = setInterval(() => {
      if (getToken()) checkRoles(navigate); // re-check token in case of logout
    }, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [navigate]);

  return <Outlet />;
}

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[#080D19] text-white">
        <Routes>
          {/* ── Exempt from guards ─────────────────────────────────────── */}
          <Route path="/deactivated" element={<DeactivatedPage />} />
          <Route path="/suspended" element={<SuspendedPage />} />

          {/* ── All other routes: guarded ──────────────────────────────── */}
          <Route element={<DeactivatedGuard />}>
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
            <Route path="/messages" element={<MessagesPage />} />
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
            <Route path="*" element={<Navigate to="/" />} />
          </Route>
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
