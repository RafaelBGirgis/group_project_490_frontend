import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { Navbar } from "../components";
import ProfileAvatar from "../components/profile_avatar";
import { ROLE_THEMES } from "../components/theme";
import { getCoachAccessState, getImmediateCoachAccessState } from "../utils/roleAccess";
import { getImmediateRoleState, resolveRoleState } from "../utils/sessionAuth";
import { setLastRoleContext } from "../utils/sessionCache";
import {
  PlanMyWeekProvider,
  usePlanMyWeek,
} from "../contexts/plan_my_week_context";
import { fetchMe } from "../api/client";
import { listAcceptedClients } from "../api/plan_my_week";
import BuildPlanTab from "../components/plan_my_week/build_plan_tab";
import BrowsePlansTab from "../components/plan_my_week/browse_plans_tab";
import ViewPlansTab from "../components/plan_my_week/view_plans_tab";
import MyPlansTab from "../components/plan_my_week/my_plans_tab";
import PrevScriptsTab from "../components/plan_my_week/prev_scripts_tab";

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
  const immediateRoleState = getImmediateRoleState();
  const immediateCoachAccess = getImmediateCoachAccessState();
  const [account, setAccount] = useState(null);
  const [canSwitchToCoach, setCanSwitchToCoach] = useState(
    immediateCoachAccess.canAccessCoach
  );
  const [canSwitchToAdmin, setCanSwitchToAdmin] = useState(immediateRoleState.hasAdminRole);

  useEffect(() => {
    setLastRoleContext({
      role,
      dashboardPath: role === "coach" ? "/coach" : "/client",
    });
  }, [role]);

  useEffect(() => {
    fetchMe()
      .then(async (me) => {
        setAccount(me);
        const roleState = await resolveRoleState().catch(() => immediateRoleState);
        const coachAccess = await getCoachAccessState(me, roleState).catch(
          () => immediateCoachAccess
        );
        setCanSwitchToCoach(coachAccess.canAccessCoach);
        setCanSwitchToAdmin(Boolean(roleState?.hasAdminRole));
      })
      .catch(() => {});
  }, []);

  const shouldBlockCoachPlanner =
    role === "coach" &&
    immediateRoleState.roleNames.length > 0 &&
    !immediateRoleState.hasAdminRole &&
    !immediateCoachAccess.canAccessCoach;

  if (shouldBlockCoachPlanner) {
    return <Navigate to="/profile" replace />;
  }

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
        canSwitchToCoach={role === "client" ? canSwitchToCoach : false}
        switchOptions={
          role === "coach"
            ? [
                { label: "Client", to: "/client" },
                ...(canSwitchToAdmin ? [{ label: "Admin", to: "/admin" }] : []),
              ]
            : [
                ...(canSwitchToCoach ? [{ label: "Coach", to: "/coach" }] : []),
                ...(canSwitchToAdmin ? [{ label: "Admin", to: "/admin" }] : []),
              ]
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
  const theme = ROLE_THEMES[state.role] ?? ROLE_THEMES.client;
  const isClient = state.role === "client";
  const TABS = useMemo(
    () => [
      { key: "build", label: "Build Plan" },
      { key: "browse", label: "Browse Plans" },
      { key: "view", label: "My Scheduled" },
      ...(isClient
        ? [{ key: "my_plans", label: "My Plans" }]
        : [{ key: "prev_scripts", label: "Previous Scripts" }]),
    ],
    [isClient]
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
                ? `${theme.tagText}`
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
            style={state.activeTab === t.key ? { borderColor: theme.accent } : undefined}
          >
            {t.label}
          </button>
        ))}
        {state.role === "coach" && state.selectedClientId != null ? (
          <div className="ml-auto flex items-center gap-2 text-xs text-gray-400">
            <span>{state.selectedClientName || `Client #${state.selectedClientId}`}</span>
            <button
              className={`${theme.tagText} hover:underline`}
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
      {state.activeTab === "my_plans" ? <MyPlansTab /> : null}
      {state.activeTab === "prev_scripts" ? <PrevScriptsTab /> : null}
    </div>
  );
}

const CLIENT_PAGE_SIZE = 12;

function ClientPicker() {
  const { dispatch } = usePlanMyWeek();
  const [text, setText] = useState("");
  const [skip, setSkip] = useState(0);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");
    // Tiny debounce so typing doesn't fire a request per keystroke
    const handle = setTimeout(() => {
      listAcceptedClients({ text: text.trim() || undefined, skip, limit: CLIENT_PAGE_SIZE })
        .then((rows) => alive && setClients(rows))
        .catch((e) => alive && setError(e?.message || "Failed to load clients"))
        .finally(() => alive && setLoading(false));
    }, 200);
    return () => {
      alive = false;
      clearTimeout(handle);
    };
  }, [text, skip]);

  return (
    <div className="space-y-3">
      <header className="flex items-center justify-between gap-3">
        <h2 className="text-sm uppercase tracking-widest text-gray-500">Select a client</h2>
        <input
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setSkip(0);
          }}
          placeholder="Search by name…"
          className="bg-[#0A1020] border border-white/10 rounded-lg px-3 py-1.5 text-sm w-64"
        />
      </header>

      {error ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>
      ) : null}

      {loading ? (
        <div className="rounded-xl border border-white/10 bg-[#0F1729] p-6 text-sm text-gray-400 text-center">
          Loading your clients…
        </div>
      ) : clients.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-[#0F1729] p-6 text-sm text-gray-400 text-center">
          {text.trim() ? "No clients match that search." : "You have no active clients yet."}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {clients.map((c) => (
            <button
              key={c.client_id}
              onClick={() => dispatch({ type: "SELECT_CLIENT", clientId: c.client_id, clientName: c.name || null })}
              className="text-left rounded-xl border border-white/10 bg-[#0F1729] hover:bg-[#13192A] p-4 flex items-center gap-3 transition-colors"
            >
              <ProfileAvatar src={c.pfp_url} alt={c.name} name={c.name} size="lg" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-white truncate">{c.name || `Client #${c.client_id}`}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {c.age || "—"} · {c.gender || "—"}
                </p>
                {c.goal ? <p className="text-xs text-orange-300 mt-1 capitalize">Goal: {c.goal}</p> : null}
              </div>
            </button>
          ))}
        </div>
      )}

      <footer className="flex items-center justify-between text-xs text-gray-400 pt-1">
        <span>
          Page {Math.floor(skip / CLIENT_PAGE_SIZE) + 1}
          {clients.length ? ` · showing ${clients.length}` : ""}
        </span>
        <div className="flex gap-2">
          <button
            disabled={skip === 0}
            onClick={() => setSkip(Math.max(0, skip - CLIENT_PAGE_SIZE))}
            className="px-3 py-1 rounded border border-white/10 disabled:opacity-30"
          >
            ← Prev
          </button>
          <button
            disabled={clients.length < CLIENT_PAGE_SIZE}
            onClick={() => setSkip(skip + CLIENT_PAGE_SIZE)}
            className="px-3 py-1 rounded border border-white/10 disabled:opacity-30"
          >
            Next →
          </button>
        </div>
      </footer>
    </div>
  );
}
