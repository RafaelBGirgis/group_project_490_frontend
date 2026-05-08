import { Navbar } from "../components";
import AvailabilityManager from "../components/availability_manager";
import { useState, useEffect } from "react";
import { fetchMe } from "../api/client";

export default function AvailabilityPage() {
  const [account, setAccount] = useState(null);

  useEffect(() => {
    fetchMe()
      .then(setAccount)
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-[#080D19] text-white">
      <Navbar
        role="client"
        userName={
          account?.name
            ? account.name.split(" ").map((n) => n[0]).join("").toUpperCase()
            : "?"
        }
      />
      <div className="max-w-4xl mx-auto px-6 py-8">
        <header className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Manage Your Availability</h1>
          <p className="text-gray-400">
            Set when you're available for coaching, workouts, and consultations.
            Block off time when you're busy.
          </p>
        </header>

        <AvailabilityManager />
      </div>
    </div>
  );
}
