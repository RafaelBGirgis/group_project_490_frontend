import { useState } from "react";
import { logout, fetchAuthRoles } from "../api/auth";
import { activateAccount } from "../api/client";

export default function DeactivatedPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleReactivate() {
    try {
      setLoading(true);
      setError(null);
      await activateAccount();
      window.location.href = "/client";
    } catch (err) {
      setError(err?.message || "Failed to reactivate account");
      setLoading(false);
    }
  }

  function handleLogout() {
    logout();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#080D19]">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white mb-4">Account Deactivated</h1>
        <p className="text-gray-300 mb-8">Your account has been deactivated.</p>
        <div className="flex gap-4 justify-center">
          <button
            onClick={handleReactivate}
            disabled={loading}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
          >
            {loading ? "Reactivating..." : "Reactivate Account"}
          </button>
          <button
            onClick={handleLogout}
            disabled={loading}
            className="px-8 py-3 bg-gray-600 hover:bg-gray-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
          >
            Logout
          </button>
        </div>
        {error && <p className="text-red-400 mt-4">{error}</p>}
      </div>
    </div>
  );
}
