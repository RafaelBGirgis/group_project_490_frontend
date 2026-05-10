import { useState } from "react";
import { logout, fetchAuthRoles } from "../api/auth";

export default function SuspendedPage() {
  const [loading, setLoading] = useState(false);

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
        <p className="text-gray-300 mb-8">Your account has been suspended. Contact support if you believe this is an error.</p>
        <div className="flex gap-4 justify-center">
          <button
            onClick={handleLogout}
            disabled={loading}
            className="px-8 py-3 bg-gray-600 hover:bg-gray-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
          >
            {loading ? "Logging out..." : "Logout"}
          </button>
        </div>
      </div>
    </div>
  );
}
