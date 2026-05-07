import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Navbar } from "../components";
import {
  PlanMyWeekProvider,
  usePlanMyWeek,
} from "../contexts/plan_my_week_context";
import { fetchMe } from "../api/client";
import { listAcceptedClients } from "../api/plan_my_week";
import BuildPlanTab from "../components/plan_my_week/build_plan_tab";
import BrowsePlansTab from "../components/plan_my_week/browse_plans_tab";
import ViewPlansTab from "../components/plan_my_week/view_plans_tab";

export default function PlanMyWeekPage() {
  const [params] = useSearchParams();
  const role = params.get("role") === "coach" ? "coach" : "client";
  return (
    <PlanMyWeekProvider initialRole={role}>
      <Inner role={role} />
    </PlanMyWeekProvider>
  );
}

function Inner({ role }) {
  const navigate = useNavigate();
  const { state } = usePlanMyWeek();
  const [account, setAccount] = useState(null);

  useEffect(() => {
    fetchMe().then(setAccount).catch(() => {});
  }, []);

  // Coach must select a client before tabs open.
  const needsClientPicker = role === "coach" && state.selectedClientId == null;

  return (
    <div className="min-h-screen bg-[#080D19] text-white">
      <Navbar
        role={role}
        userName={
          account?.name
            ? account.name.split(" ").map((n) => n[0]).join("").toUpperCase()
            : "?"
        }
      />
      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Plan My Week</h1>
            <p className="text-sm text-gray-400">
              {role === "coach"
                ? "Build, browse, and prescribe workout plans for your clients."
                : "Build a plan, browse the catalog, and schedule it on your week."}
            </p>
          </div>
          <button
            className="px-3 py-1.5 rounded-lg border border-white/10 text-sm text-gray-300 hover:bg-white/5"
            onClick={() => navigate(role === "coach" ? "/coach" : "/client")}
          >
            ← Back to dashboard
          </button>
        </header>

        {needsClientPicker ? <ClientPicker /> : <Tabs />}
      </div>
    </div>
  );
}

function Tabs() {
  const { state, dispatch } = usePlanMyWeek();
  const TABS = useMemo(
    () => [
      { key: "build", label: "Build Plan" },
      { key: "browse", label: "Browse Plans" },
      { key: "view", label: "My Scheduled" },
    ],
    []
  );

  return (
    <div className="space-y-4">
      <nav className="flex gap-2 border-b border-white/10">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => dispatch({ type: "SET_TAB", tab: t.key })}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              state.activeTab === t.key
                ? "border-orange-400 text-orange-300"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            {t.label}
          </button>
        ))}
        {state.role === "coach" && state.selectedClientId != null ? (
          <div className="ml-auto flex items-center gap-2 text-xs text-gray-400">
            <span>Client #{state.selectedClientId}</span>
            <button
              className="text-blue-400 hover:underline"
              onClick={() => dispatch({ type: "SELECT_CLIENT", clientId: null })}
            >
              change
            </button>
          </div>
        ) : null}
      </nav>

      {state.activeTab === "build" ? <BuildPlanTab /> : null}
      {state.activeTab === "browse" ? <BrowsePlansTab /> : null}
      {state.activeTab === "view" ? <ViewPlansTab /> : null}
    </div>
  );
}

function ClientPicker() {
  const { dispatch } = usePlanMyWeek();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    listAcceptedClients()
      .then((rows) => setClients(rows))
      .catch((e) => setError(e?.message || "Failed to load clients"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl border border-white/10 bg-[#0F1729] p-6 text-sm text-gray-400">
        Loading your clients…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
        {error}
      </div>
    );
  }

  if (!clients.length) {
    return (
      <div className="rounded-xl border border-white/10 bg-[#0F1729] p-6 text-sm text-gray-400">
        You have no active clients yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-sm uppercase tracking-widest text-gray-500">Select a client</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {clients.map((c) => (
          <button
            key={c.id ?? c.client_id}
            onClick={() =>
              dispatch({ type: "SELECT_CLIENT", clientId: c.id ?? c.client_id })
            }
            className="text-left rounded-xl border border-white/10 bg-[#0F1729] hover:bg-[#13192A] p-4"
          >
            <p className="font-semibold text-white">{c.name || `Client #${c.id ?? c.client_id}`}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {(c.details?.base_account?.age || c.age || "—")} · {(c.details?.base_account?.gender || c.gender || "—")}
            </p>
            {c.goal ? <p className="text-xs text-orange-300 mt-1">Goal: {c.goal}</p> : null}
          </button>
        ))}
      </div>
    </div>
  );
}
