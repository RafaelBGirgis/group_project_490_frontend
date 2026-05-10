import { useState, useEffect, useRef, useMemo } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import {
  Navbar,
  StatCard,
  DashboardCard,
  ListRow,
  StatusBadge,
  SectionHeader,
  Overlay,
  SkeletonStatCard,
  SkeletonDashCard,
} from "../components";
import { getToken } from "../api/auth";
import {
  fetchAdminStats,
  fetchAllUsers,
  updateUserStatus,
  suspendUser,
  unsuspendUser,
  deleteUser,
  fetchAnalytics,
  fetchCoachRequests,
  fetchReports,
  deleteReport,
  resolveCoachRequest,
} from "../api/admin";
import RoleRequestsDetail from "../components/overlays/role_requests_detail";
import ReportsDetail from "../components/overlays/reports_detail";
import ManageFitness from "../components/admin/manage_fitness";
import { getImmediateRoleState, resolveRoleState } from "../utils/sessionAuth";
import { setLastRoleContext } from "../utils/sessionCache";

const role = "admin";
// MUSCLE_GROUPS / EQUIPMENT removed with the legacy ExerciseForm.
// ManageFitness uses the real workout_type enum + an equipment table now.
const USERS_PER_PAGE = 10;
// EXERCISES_PER_PAGE removed alongside the legacy exercise-bank UI.
// ManageFitness owns its own pagination per tab.

/* ═══════════════════════════════════════════════════════════════════════
   ANIMATED COUNTER — numbers count up on mount
   ═══════════════════════════════════════════════════════════════════════ */

function AnimatedNumber({ value, duration = 1200 }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    const target = typeof value === "number" ? value : 0;
    if (target === 0) { setDisplay(0); return; }
    let start = null;
    const step = (ts) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setDisplay(Math.floor(eased * target));
      if (progress < 1) ref.current = requestAnimationFrame(step);
    };
    ref.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(ref.current);
  }, [value, duration]);

  return <>{display.toLocaleString()}</>;
}

/* ═══════════════════════════════════════════════════════════════════════
   SPARKLINE — tiny inline SVG chart
   ═══════════════════════════════════════════════════════════════════════ */

function Sparkline({ data, color = "#EF4444", height = 32, width = 120 }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg width={width} height={height} className="opacity-80">
      <defs>
        <linearGradient id={`spark-${color.replace("#","")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <polygon
        points={`0,${height} ${points} ${width},${height}`}
        fill={`url(#spark-${color.replace("#","")})`}
      />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   BAR CHART — animated bars with hover tooltips
   ═══════════════════════════════════════════════════════════════════════ */

function BarChart({ data, labelKey, valueKey, secondaryKey, color = "#EF4444", secondaryColor = "#3B82F6", height = 200 }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const [animated, setAnimated] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setAnimated(true); },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  if (!data || data.length === 0) return null;

  // Sqrt scaling: a single outlier (e.g. one bulk-seed day with 91 signups
  // dwarfing every other day's 1–5 count) was making the rest of the chart
  // unreadable. sqrt(v)/sqrt(max) compresses the outlier without lying about
  // ordering — taller still means more, just not "65× more pixels."
  const allValues = data.flatMap((d) =>
    secondaryKey ? [d[valueKey], d[secondaryKey]] : [d[valueKey]]
  );
  const maxVal = Math.max(...allValues, 1);
  const scaledMax = Math.sqrt(maxVal);
  const scale = (v) => (v > 0 ? (Math.sqrt(v) / scaledMax) * 100 : 0);

  return (
    <div ref={ref} className="relative" style={{ height }}>
      <div className="flex items-end justify-between gap-2 h-full px-1">
        {data.map((d, i) => {
          const pct = animated ? scale(d[valueKey]) : 0;
          const secPct = secondaryKey && animated ? scale(d[secondaryKey]) : 0;
          return (
            <div
              key={i}
              className="flex-1 flex flex-col items-center justify-end h-full relative group"
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              {/* Tooltip */}
              {hoveredIdx === i && (
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-[#1a2236] border border-white/10 rounded-lg px-3 py-1.5 text-[10px] whitespace-nowrap z-20 shadow-xl">
                  <p className="text-white font-semibold">{d[valueKey]} active</p>
                  {secondaryKey && <p className="text-gray-400">{d[secondaryKey]} new</p>}
                </div>
              )}
              {/* Bars — wider since fewer buckets means more horizontal space.
                  Tooltip on hover still shows the raw count, so visual scaling
                  doesn't hide information. */}
              <div className="w-full flex gap-1 items-end justify-center" style={{ height: `${height - 24}px` }}>
                <div
                  className="flex-1 rounded-t-md transition-all duration-700 ease-out max-w-[18px]"
                  style={{
                    height: `${pct}%`,
                    minHeight: d[valueKey] > 0 ? "2px" : "0px",
                    backgroundColor: color,
                    opacity: hoveredIdx === i ? 1 : 0.85,
                    transitionDelay: `${i * 40}ms`,
                  }}
                />
                {secondaryKey && (
                  <div
                    className="flex-1 rounded-t-md transition-all duration-700 ease-out max-w-[18px]"
                    style={{
                      height: `${secPct}%`,
                      minHeight: d[secondaryKey] > 0 ? "2px" : "0px",
                      backgroundColor: secondaryColor,
                      opacity: hoveredIdx === i ? 1 : 0.65,
                      transitionDelay: `${i * 40 + 100}ms`,
                    }}
                  />
                )}
              </div>
              <span className="text-[10px] text-gray-500 mt-1 truncate w-full text-center">{d[labelKey]}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   DONUT CHART — animated ring with center label
   ═══════════════════════════════════════════════════════════════════════ */

function DonutChart({ segments, size = 120, strokeWidth = 14 }) {
  const [animated, setAnimated] = useState(false);
  const ref = useRef(null);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = segments.reduce((s, seg) => s + seg.value, 0);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setAnimated(true); },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  let offset = 0;
  return (
    <div ref={ref} className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {segments.map((seg, i) => {
          const pct = seg.value / total;
          const dash = animated ? pct * circumference : 0;
          const gap = circumference - dash;
          const currentOffset = offset;
          offset += pct * circumference;
          return (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${dash} ${gap}`}
              strokeDashoffset={-currentOffset}
              strokeLinecap="round"
              className="transition-all duration-1000 ease-out"
              style={{ transitionDelay: `${i * 200}ms` }}
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-white font-bold text-lg"><AnimatedNumber value={total} /></span>
        <span className="text-gray-500 text-[9px] uppercase tracking-widest">Total</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   MAIN ADMIN DASHBOARD
   ═══════════════════════════════════════════════════════════════════════ */

export default function AdminDash() {
  const navigate = useNavigate();
  const immediateRoleState = getImmediateRoleState();

  /*  auth guard  */
  const [authed, setAuthed] = useState(false);
  useEffect(() => {
    setAuthed(true);
  }, [navigate]);

  useEffect(() => {
    setLastRoleContext({ role: "admin", dashboardPath: "/admin" });
  }, []);

  useEffect(() => {
    resolveRoleState()
      .then((roleState) => {
        if (!roleState.hasAdminRole) {
          navigate("/client", { replace: true });
        }
      })
      .catch(() => {});
  }, [navigate]);

  /*  state  */
  const [initials, setInitials] = useState("?");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [roleRequests, setRoleRequests] = useState([]);
  const [reports, setReports] = useState([]);

  /*  overlay state  */
  const [overlay, setOverlay] = useState(null);
  const closeOverlay = () => setOverlay(null);

  /*  user management state  */
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("all");
  const [userStatusFilter, setUserStatusFilter] = useState("all");
  const [userPage, setUserPage] = useState(1);

  /*  exercise bank state was removed — replaced by <ManageFitness />,
      which manages its own state internally per tab (workouts/activities/
      equipment/plans). The handlers and pagination state below were also
      cleaned out alongside the legacy UI.  */

  /*  analytics state  */
  const [analyticsPeriod, setAnalyticsPeriod] = useState("daily");

  /*  data loading  */
  useEffect(() => {
    if (!authed) return;
    (async () => {
      setLoading(true);

      // Fetch account info — use a direct fetch to avoid the global 401
      // redirect in apiFetch (admin may not have a backend-valid JWT yet)
      try {
        const token = getToken();
        const API_BASE = import.meta.env.PROD ? "https://api.till-failure.us" : "";
        const res = await fetch(`${API_BASE}/me`, {
          credentials: "include",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const me = await res.json();
          if (me?.name) setInitials(me.name.split(" ").map((n) => n[0]).join("").toUpperCase());
        }
      } catch {
        // Initials are decorative; keep loading the dashboard if this request fails.
      }

      try {
        const [s, u, an, requests] = await Promise.all([
          fetchAdminStats().catch(() => ({
            total_accounts: 0,
            total_clients: 0,
            total_coaches: 0,
            pending_role_requests: 0,
            active_accounts: 0,
            deactivated_accounts: 0,
            signups_30d: 0,
            avg_coach_rating: 0,
            total_coach_reviews: 0,
            coaches_with_reviews: 0,
            total_revenue: 0,
            active_coach_client_pairs: 0,
            total_messages_sent: 0,
          })),
          fetchAllUsers().catch(() => []),
          fetchAnalytics().catch(() => ({ daily: [], weekly: [], monthly: [] })),
          fetchCoachRequests().catch(() => []),
        ]);
        // Exercises are no longer fetched here — ManageFitness loads its
        // own data per tab (workouts/activities/equipment/plans).
        const reportsResponse = await fetchReports().catch(() => []);

        setStats(s);
        setUsers(u);
        setAnalytics(an);
        setRoleRequests(requests);
        setReports(reportsResponse);
      } finally {
        setLoading(false);
      }
    })();
  }, [authed]);

  /*  handlers  */
  const handleApprove = async (id) => {
    await resolveCoachRequest(id, true);
    setRoleRequests((p) => p.map((r) => r.id === id ? { ...r, is_approved: true } : r));
  };

  const handleReject = async (id) => {
    await resolveCoachRequest(id, false);
    setRoleRequests((p) => p.map((r) => r.id === id ? { ...r, is_approved: false } : r));
  };
  // Reports come from two tables (coach_report + client_report) with
  // independent primary keys, so dismissal needs both kind and id to
  // disambiguate. Hits DELETE /roles/admin/reports/{kind}/{id} so the row
  // is gone for good, then drops it from the local feed.
  const handleDismissReport = async (kind, id) => {
    try {
      await deleteReport(kind, id);
      setReports((p) => p.filter((r) => !(r.kind === kind && r.id === id)));
    } catch (e) {
      window.alert(e?.message || "Dismiss failed");
    }
  };

  // "Take Action" on a report: suspend the *reported* account (the coach for
  // a client-on-coach report, the client for a coach-on-client report) and
  // delete the report row so it stops showing up in the feed. The two writes
  // aren't atomic — if the suspend succeeds and the delete fails the row will
  // still be there on next reload, which is acceptable (admin can dismiss it
  // manually).
  const handleEscalateReport = async (kind, id) => {
    const report = reports.find((r) => r.kind === kind && r.id === id);
    if (!report?.reported_account_id) {
      window.alert("Cannot suspend — reported account not found.");
      return;
    }
    const who = kind === "client_on_coach" ? "coach" : "client";
    if (!window.confirm(`Suspend the reported ${who} (${report.reported_name})?`)) return;
    try {
      await suspendUser(report.reported_account_id);
      setUsers((prev) =>
        prev.map((u) => u.id === report.reported_account_id ? { ...u, status: "suspended", is_suspended: true } : u)
      );
      await deleteReport(kind, id).catch(() => {});
      setReports((p) => p.filter((r) => !(r.kind === kind && r.id === id)));
    } catch (e) {
      window.alert(e?.message || "Suspend failed");
    }
  };

  const handleUserStatusChange = async (userId, newStatus) => {
    if (
      newStatus !== "active" &&
      !window.confirm("Suspend this account? They'll be signed out and any active coach/client mappings will be torn down.")
    ) return;
    try {
      if (newStatus === "suspended") {
        await suspendUser(userId);
        setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, status: "suspended", is_suspended: true } : u));
      } else if (newStatus === "active") {
        await unsuspendUser(userId);
        setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, status: "active", is_suspended: false } : u));
      } else {
        await updateUserStatus(userId, newStatus);
        setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, status: newStatus } : u));
      }
    } catch (e) {
      window.alert(e?.message || "Action failed");
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm("Permanently delete this account? This cannot be undone.")) return;
    try {
      await deleteUser(userId);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch (e) {
      window.alert(e?.message || "Delete failed");
    }
  };

  // handleSaveExercise/handleDeleteExercise removed alongside the legacy
  // exercise-bank UI; ManageFitness owns its own CRUD wiring now.

  /*  computed  */
  const pendingRequests = roleRequests.filter((r) => r.is_approved === null);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (userSearch && !u.name.toLowerCase().includes(userSearch.toLowerCase()) && !u.email.toLowerCase().includes(userSearch.toLowerCase())) return false;
      if (userRoleFilter !== "all" && u.role !== userRoleFilter) return false;
      if (userStatusFilter !== "all" && u.status !== userStatusFilter) return false;
      return true;
    });
  }, [users, userSearch, userRoleFilter, userStatusFilter]);

  // Reset to page 1 when filters change
  useEffect(() => { setUserPage(1); }, [userSearch, userRoleFilter, userStatusFilter]);

  const totalUserPages = Math.max(1, Math.ceil(filteredUsers.length / USERS_PER_PAGE));
  const paginatedUsers = filteredUsers.slice((userPage - 1) * USERS_PER_PAGE, userPage * USERS_PER_PAGE);

  // filteredExercises / paginatedExercises were dropped with the legacy
  // exercise bank; ManageFitness handles its own filtering + pagination.

  const activeAnalytics = analytics?.[analyticsPeriod] ?? [];
  const shouldBlockAdminPage =
    immediateRoleState.roleNames.length > 0 && !immediateRoleState.hasAdminRole;

  if (shouldBlockAdminPage) {
    return <Navigate to="/client" replace />;
  }

  /*  loading skeleton  */
  if (loading) {
    return (
      <div className="min-h-screen bg-[#080D19]">
        <Navbar role={role} userName="?" hideProfile />
        <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
          <div className="h-5 w-40 bg-white/5 rounded animate-pulse" />
          <div className="grid grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <SkeletonStatCard key={i} />)}
          </div>
          <div className="grid grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => <SkeletonStatCard key={i} />)}
          </div>
          <div className="h-5 w-40 bg-white/5 rounded animate-pulse" />
          <SkeletonDashCard rows={6} />
          <div className="grid grid-cols-2 gap-4">
            <SkeletonDashCard rows={4} />
            <SkeletonDashCard rows={4} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080D19]">
      <Navbar
        role={role}
        userName={initials}
        hideProfile
        switchOptions={[
          { label: "Client", to: "/client" },
          { label: "Coach", to: "/coach" },
        ]}
      />

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-8">

        {/* ═══════════════════════════════════════════════════════════════
            OVERVIEW STATS
            ═══════════════════════════════════════════════════════════════ */}
        <SectionHeader label="OVERVIEW" role={role} />

        <div className="grid grid-cols-4 gap-4">
          {/* Each tile is wrapped in DashboardCard so it inherits the shared
              hover animation (lift + accent line + glow). The single inner
              div keeps the tight stat layout — without it, DashboardCard's
              flex-col + gap-4 body would space the label/value/sub apart. */}
          <DashboardCard role={role}>
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest">TOTAL ACCOUNTS</p>
              <p className="text-2xl font-bold text-white mt-1"><AnimatedNumber value={stats?.total_accounts ?? 0} /></p>
              <Sparkline data={activeAnalytics.map((d) => d.active_users)} color="#EF4444" />
            </div>
          </DashboardCard>
          <DashboardCard role={role}>
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest">ACTIVE CLIENTS</p>
              <p className="text-2xl font-bold text-white mt-1"><AnimatedNumber value={stats?.total_clients ?? 0} /></p>
              <p className="text-xs text-red-400 mt-1">across all coaches</p>
            </div>
          </DashboardCard>
          <DashboardCard role={role}>
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest">ACTIVE COACHES</p>
              <p className="text-2xl font-bold text-white mt-1"><AnimatedNumber value={stats?.total_coaches ?? 0} /></p>
              <p className="text-xs text-red-400 mt-1">on the platform</p>
            </div>
          </DashboardCard>
          <DashboardCard role={role}>
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest">PENDING REQUESTS</p>
              <p className="text-2xl font-bold text-white mt-1"><AnimatedNumber value={stats?.pending_role_requests ?? 0} /></p>
              <p className="text-xs text-red-400 mt-1">awaiting approval</p>
            </div>
          </DashboardCard>
        </div>

        {/* Revenue & Cashflow */}
        <div className="grid grid-cols-3 gap-4">
          {/* Total Revenue — feature card */}
          <DashboardCard role={role}>
            <div className="relative">
              <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-green-500/5 blur-2xl pointer-events-none" />
              <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">TOTAL REVENUE</p>
              <p className="text-3xl font-bold text-white">
                $<AnimatedNumber value={stats?.total_revenue ?? 0} duration={1500} />
              </p>
              <p className="text-xs text-gray-500 mt-1">All-time platform earnings</p>
              <div className="mt-3">
                <Sparkline data={activeAnalytics.map((d) => d.active_users * 28 + d.new_signups * 50)} color="#22C55E" />
              </div>
            </div>
          </DashboardCard>

          {/* Active Coach-Client Pairs — /roles/admin/platform_engagement
              counts client_coach_relationship rows where is_active=true. */}
          <DashboardCard role={role}>
            <div className="relative">
              <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-blue-500/5 blur-2xl pointer-events-none" />
              <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">ACTIVE COACH-CLIENT PAIRS</p>
              <p className="text-3xl font-bold text-white">
                <AnimatedNumber value={stats?.active_coach_client_pairs ?? 0} duration={1500} />
              </p>
              <p className="text-xs text-gray-500 mt-1">Currently matched on the platform</p>
              <div className="mt-3 flex items-center gap-3">
                <div className="flex-1 h-2 bg-[#0A1020] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-1000"
                    style={{ width: `${Math.min(100, Math.round(((stats?.active_coach_client_pairs ?? 0) / Math.max(1, stats?.total_clients ?? 1)) * 100))}%` }}
                  />
                </div>
                <span className="text-[10px] text-blue-400 font-semibold whitespace-nowrap">
                  {Math.round(((stats?.active_coach_client_pairs ?? 0) / Math.max(1, stats?.total_clients ?? 1)) * 100)}% of clients
                </span>
              </div>
            </div>
          </DashboardCard>

          {/* Messages Sent — chat_message row count from
              /roles/admin/platform_engagement. */}
          <DashboardCard role={role}>
            <div className="relative">
              <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-orange-500/5 blur-2xl pointer-events-none" />
              <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">MESSAGES SENT</p>
              <p className="text-3xl font-bold text-white">
                <AnimatedNumber value={stats?.total_messages_sent ?? 0} duration={1500} />
              </p>
              <p className="text-xs text-gray-500 mt-1">Total chat messages on the platform</p>
              <div className="mt-3">
                <Sparkline
                  data={activeAnalytics.length > 1
                    ? activeAnalytics.map((d) => d.active_users)
                    : [1, 2, 3, 5, 8, 13]}
                  color="#F97316"
                />
              </div>
            </div>
          </DashboardCard>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            ENGAGEMENT ANALYTICS
            ═══════════════════════════════════════════════════════════════ */}
        <SectionHeader label="ENGAGEMENT ANALYTICS" role={role} />

        {/* KPI cards — backend-derived account metrics. Pending coach
            requests is intentionally NOT here; the OVERVIEW row already shows
            it as one of the four headline KPIs.
            Source: /roles/admin/accounts (is_active, created_at) for the
            account-status cards, and /roles/client/query/hirable_coaches for
            the platform-wide weighted rating. */}
        <div className="grid grid-cols-3 gap-4">
          <DashboardCard role={role}>
            <div className="relative">
              <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">ACTIVE ACCOUNTS</p>
              <p className="text-3xl font-bold text-white">
                <AnimatedNumber value={stats?.active_accounts ?? 0} duration={1500} />
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {stats?.deactivated_accounts != null
                  ? `${stats.deactivated_accounts} suspended`
                  : "Users with an active account"}
              </p>
              <div className="absolute -bottom-4 -right-4 w-24 h-24 rounded-full opacity-5 bg-red-500 blur-2xl pointer-events-none" />
            </div>
          </DashboardCard>

          <DashboardCard role={role}>
            <div className="relative">
              <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">NEW SIGNUPS (30D)</p>
              <p className="text-3xl font-bold text-white">
                <AnimatedNumber value={stats?.signups_30d ?? 0} duration={1500} />
              </p>
              <p className="text-xs text-gray-500 mt-1">Accounts created in the last 30 days</p>
              <div className="absolute -bottom-4 -right-4 w-24 h-24 rounded-full opacity-5 bg-red-500 blur-2xl pointer-events-none" />
            </div>
          </DashboardCard>

          {/* Avg coach rating — formatted to match the other two tiles so all
              three sit on one row with consistent visual weight. */}
          <DashboardCard role={role}>
            <div className="relative">
              <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">AVG COACH RATING</p>
              <p className="text-3xl font-bold text-white">
                {stats?.avg_coach_rating
                  ? `${Number(stats.avg_coach_rating).toFixed(1)} / 5`
                  : "—"}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {stats?.total_coach_reviews ?? 0} review{stats?.total_coach_reviews === 1 ? "" : "s"} platform-wide
              </p>
              <div className="absolute -bottom-4 -right-4 w-24 h-24 rounded-full opacity-5 bg-yellow-400 blur-2xl pointer-events-none" />
            </div>
          </DashboardCard>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-3 gap-4">
          {/* Bar chart — 2 cols. DashboardCard for hover lift; the className
              prop forwards the col-span. */}
          <DashboardCard role={role} className="col-span-2">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-white font-semibold">Active Users & Signups</p>
                  <p className="text-gray-500 text-xs mt-0.5">Platform engagement over time</p>
                </div>
                <div className="flex gap-1 bg-[#0A1020] rounded-lg p-0.5">
                  {["daily", "weekly", "monthly"].map((p) => (
                    <button
                      key={p}
                      onClick={() => setAnalyticsPeriod(p)}
                      className={`px-3 py-1.5 rounded-md text-[10px] font-semibold uppercase tracking-wide transition-colors ${
                        analyticsPeriod === p
                          ? "bg-red-500/20 text-red-400"
                          : "text-gray-500 hover:text-gray-300"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between mb-3 text-[10px]">
                <div className="flex gap-4">
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-red-500 inline-block" /> Active Users</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-blue-500 inline-block" /> New Signups</span>
                </div>
                <span className="text-gray-600 italic">hover for exact counts</span>
              </div>
              <BarChart
                data={activeAnalytics}
                labelKey="label"
                valueKey="active_users"
                secondaryKey="new_signups"
                color="#EF4444"
                secondaryColor="#3B82F6"
                height={140}
              />
            </div>
          </DashboardCard>

          {/* Donut — Clients & Coaches only. items-center on the card body so
              DashboardCard centers the chart. */}
          <DashboardCard role={role} className="items-center">
            <div className="flex flex-col items-center">
              <p className="text-white font-semibold mb-1">User Distribution</p>
              <p className="text-gray-500 text-xs mb-4">Clients vs Coaches</p>
              <DonutChart
                segments={[
                  { value: stats?.total_clients ?? 0, color: "#3B82F6", label: "Clients" },
                  { value: stats?.total_coaches ?? 0, color: "#F97316", label: "Coaches" },
                ]}
                size={140}
              />
              <div className="flex gap-4 mt-4">
                {[
                  { color: "bg-blue-500", label: "Clients" },
                  { color: "bg-orange-500", label: "Coaches" },
                ].map((l) => (
                  <span key={l.label} className="flex items-center gap-1.5 text-[10px] text-gray-400">
                    <span className={`w-2 h-2 rounded-full ${l.color}`} />
                    {l.label}
                  </span>
                ))}
              </div>
            </div>
          </DashboardCard>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            USER MANAGEMENT
            ═══════════════════════════════════════════════════════════════ */}
        <SectionHeader label="USER MANAGEMENT" role={role} />

        <div className="bg-[#0E1628] rounded-2xl border border-white/5 overflow-hidden">
          {/* Search & Filters */}
          <div className="p-5 border-b border-white/5 space-y-3">
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="Search users by name or email..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="flex-1 bg-[#0A1020] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none"
              />
              <select
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value)}
                className="bg-[#0A1020] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-gray-300 focus:outline-none"
              >
                <option value="all">All Roles</option>
                <option value="client">Clients</option>
                <option value="coach">Coaches</option>
                <option value="admin">Admins</option>
              </select>
              <select
                value={userStatusFilter}
                onChange={(e) => setUserStatusFilter(e.target.value)}
                className="bg-[#0A1020] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-gray-300 focus:outline-none"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
            <p className="text-gray-500 text-xs">{filteredUsers.length} user{filteredUsers.length !== 1 ? "s" : ""} found</p>
          </div>

          {/* User table */}
          <div className="divide-y divide-white/5">
            {/* Header row */}
            <div className="grid grid-cols-12 gap-4 px-5 py-2.5 text-[10px] text-gray-500 uppercase tracking-widest">
              <span className="col-span-3">User</span>
              <span className="col-span-3">Email</span>
              <span className="col-span-1">Role</span>
              <span className="col-span-1">Status</span>
              <span className="col-span-2">Last Active</span>
              <span className="col-span-2 text-right">Actions</span>
            </div>

            {filteredUsers.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8">No users match your filters</p>
            ) : (
              paginatedUsers.map((user) => (
                <div key={user.id} className="grid grid-cols-12 gap-4 px-5 py-3 items-center hover:bg-white/[0.02] transition-colors">
                  {/* Name + avatar */}
                  <div className="col-span-3 flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-[10px] shrink-0"
                      style={{ backgroundColor: user.role === "coach" ? "#F97316" : user.role === "admin" ? "#EF4444" : "#3B82F6" }}
                    >
                      {user.name?.split(" ").map((n) => n[0]).join("").toUpperCase()}
                    </div>
                    <span className="text-white text-sm font-medium truncate">{user.name}</span>
                  </div>
                  <span className="col-span-3 text-gray-400 text-sm truncate">{user.email}</span>
                  <div className="col-span-1">
                    <StatusBadge
                      label={user.role}
                      variant={user.role === "coach" ? "warning" : user.role === "admin" ? "danger" : "info"}
                    />
                  </div>
                  <div className="col-span-1">
                    <StatusBadge
                      label={user.status}
                      variant={
                        user.status === "active" ? "success"
                        : user.status === "suspended" ? "warning"
                        : "error"
                      }
                      dot
                    />
                  </div>
                  <span className="col-span-2 text-gray-500 text-xs">{user.last_active}</span>
                  <div className="col-span-2 flex justify-end gap-2">
                    {/* active → Suspend (orange)
                        suspended → Unsuspend (green) via /unsuspend
                        inactive (deactivated by self) → disabled pill, can't re-activate from here */}
                    {user.status === "active" ? (
                      <button
                        onClick={() => handleUserStatusChange(user.id, "suspended")}
                        className="text-[10px] px-3 py-1.5 rounded-lg border border-orange-500/30 text-orange-400 hover:bg-orange-500/10 transition-colors"
                      >
                        Suspend
                      </button>
                    ) : user.status === "suspended" ? (
                      <button
                        onClick={() => handleUserStatusChange(user.id, "active")}
                        className="text-[10px] px-3 py-1.5 rounded-lg border border-green-500/30 text-green-400 hover:bg-green-500/10 transition-colors"
                      >
                        Unsuspend
                      </button>
                    ) : (
                      <button
                        disabled
                        className="text-[10px] px-3 py-1.5 rounded-lg border border-gray-600/30 text-gray-600 cursor-not-allowed"
                        title="User self-deactivated; they can reactivate via /deactivated"
                      >
                        Inactive
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteUser(user.id)}
                      className="text-[10px] px-3 py-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Permanently delete account"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination */}
          {totalUserPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-white/5">
              <p className="text-gray-500 text-xs">
                Showing {(userPage - 1) * USERS_PER_PAGE + 1}–{Math.min(userPage * USERS_PER_PAGE, filteredUsers.length)} of {filteredUsers.length}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setUserPage((p) => Math.max(1, p - 1))}
                  disabled={userPage === 1}
                  className="px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:bg-white/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  ← Prev
                </button>
                {Array.from({ length: totalUserPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setUserPage(page)}
                    className={`w-8 h-8 rounded-lg text-xs font-semibold transition-colors ${
                      userPage === page
                        ? "bg-red-500/20 text-red-400"
                        : "text-gray-500 hover:bg-white/5 hover:text-gray-300"
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => setUserPage((p) => Math.min(totalUserPages, p + 1))}
                  disabled={userPage === totalUserPages}
                  className="px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:bg-white/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            ROLE REQUESTS
            ═══════════════════════════════════════════════════════════════ */}
        <SectionHeader label="ROLE REQUESTS" role={role} />

        <DashboardCard
          role={role}
          title={`Pending Approvals (${pendingRequests.length})`}
          action={{ label: "View all", onClick: () => setOverlay("requests") }}
        >
          {pendingRequests.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-4">No pending requests</p>
          ) : (
            <div className="space-y-2">
              {pendingRequests.slice(0, 5).map((req) => (
                <ListRow
                  key={req.id}
                  label={req.account_name}
                  sub={`Requesting: ${req.requested_role}`}
                  right={
                    <div className="flex gap-2">
                      <button onClick={() => handleApprove(req.id)} className="text-xs bg-green-900/40 text-green-400 border border-green-500/30 rounded-full px-3 py-1 hover:bg-green-900/60 transition-colors">Approve</button>
                      <button onClick={() => handleReject(req.id)} className="text-xs bg-red-900/40 text-red-400 border border-red-500/30 rounded-full px-3 py-1 hover:bg-red-900/60 transition-colors">Reject</button>
                    </div>
                  }
                />
              ))}
            </div>
          )}
        </DashboardCard>

        {/* ═══════════════════════════════════════════════════════════════
            FITNESS MANAGEMENT — full CRUD across workouts, activities,
            equipment, and plans. Replaces the old Exercise-only bank.
            Component lives in src/components/admin/manage_fitness.jsx and
            calls the listAdmin / createAdmin / updateAdmin / deleteAdmin
            helpers in api/admin.js, which hit /roles/admin/fitness on
            the backend.
            ═══════════════════════════════════════════════════════════════ */}
        <SectionHeader label="FITNESS MANAGEMENT" role={role} />

        <ManageFitness />

        {/* ═══════════════════════════════════════════════════════════════
            REPORTS & FLAGS
            ═══════════════════════════════════════════════════════════════ */}
        <SectionHeader label="REPORTS & FLAGS" role={role} />

        <DashboardCard
          role={role}
          title="Active Reports"
          action={{ label: "View all", onClick: () => setOverlay("reports") }}
        >
          {reports.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-4">No active reports</p>
          ) : (
            <div className="space-y-2">
              {reports.map((report) => (
                <ListRow
                  key={`${report.kind}-${report.id}`}
                  label={`${report.reporter_name} reported ${report.reported_name}`}
                  sub={report.reason}
                  right={
                    <div className="flex items-center gap-2">
                      <StatusBadge label="Flagged" variant="danger" dot />
                      <span className="text-gray-600 text-[10px]">{report.created_at}</span>
                    </div>
                  }
                />
              ))}
            </div>
          )}
        </DashboardCard>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          OVERLAYS
          ═══════════════════════════════════════════════════════════════ */}

      <Overlay open={overlay === "requests"} onClose={closeOverlay} title="Role Promotion Requests" wide>
        {/* onView routes the admin to the same public coach profile page
            clients see when browsing for a coach. Reuses normalizeStored
            CoachProfile, the certifications/experiences UI, the bio, etc.
            — no separate admin-only render path. */}
        <RoleRequestsDetail
          requests={roleRequests}
          onApprove={handleApprove}
          onReject={handleReject}
          onView={(req) => {
            if (req?.coach_id != null) {
              navigate(`/coaches/${req.coach_id}`);
              closeOverlay();
            }
          }}
        />
      </Overlay>

      <Overlay open={overlay === "reports"} onClose={closeOverlay} title="Active Reports" wide>
        <ReportsDetail reports={reports} onDismiss={handleDismissReport} onEscalate={handleEscalateReport} />
      </Overlay>
    </div>
  );
}

/* ExerciseForm removed — replaced by per-tab modals inside ManageFitness
   (WorkoutFormModal, ActivityFormModal, EquipmentFormModal, PlanFormModal). */
