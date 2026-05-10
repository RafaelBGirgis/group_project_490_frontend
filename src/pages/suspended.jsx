import { useEffect, useRef, useState } from "react";
import { logout, fetchAuthRoles } from "../api/auth";
import { fetchMe } from "../api/client";
import { resolveRoleState } from "../utils/sessionAuth";
import { getCoachAccessState } from "../utils/roleAccess";

const POLL_INTERVAL_MS = 10_000;

async function resolvePostLoginPath(account) {
  const roleState = await resolveRoleState();
  const coachAccess = await getCoachAccessState(account, roleState);

  if (roleState.hasAdminRole) return "/admin";
  if (roleState.hasClientRole) return "/client";
  if (coachAccess.canAccessCoach) return "/coach";
  return "/onboarding";
}

export default function SuspendedPage() {
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function checkRoles() {
      try {
        const roles = await fetchAuthRoles();
        if (cancelled) return;

        // No longer suspended — redirect to the appropriate dashboard
        if (!Array.isArray(roles) || !roles.includes("suspended")) {
          clearInterval(intervalRef.current);
          const account = await fetchMe().catch(() => null);
          const path = account ? await resolvePostLoginPath(account) : "/client";
          window.location.href = path;
        }
      } catch {
        // Silently ignore transient network errors and retry next tick
      }
    }

    // Run immediately then on interval
    checkRoles();
    intervalRef.current = setInterval(checkRoles, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(intervalRef.current);
    };
  }, []);

  function handleLogout() {
    setLoading(true);
    try {
      logout();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#080D19]">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white mb-4">Account Suspended</h1>
        <p className="text-gray-300 mb-8">
          Your account has been suspended. Contact an administrator if you believe this is an error.
        </p>
        <div className="flex gap-4 justify-center">
          <button
            onClick={handleLogout}
            disabled={loading}
            className="px-8 py-3 bg-gray-600 hover:bg-gray-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
          >
            {loading ? "Logging out..." : "Logout"}
          </button>
        </div>
        <p className="text-gray-600 mt-6 text-xs">
          Checking account status every {POLL_INTERVAL_MS / 1000}s…
        </p>
      </div>
    </div>
  );
}
