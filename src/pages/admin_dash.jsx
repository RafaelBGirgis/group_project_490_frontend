import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
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
import { fetchMe } from "../api/client";
import {
  fetchAdminStats,
  fetchAllUsers,
  updateUserStatus,
  deleteUser,
  fetchExerciseBank,
  createExercise,
  updateExercise,
  deleteExercise,
  fetchAnalytics,
  fetchCoachRequests,
  resolveCoachRequest,
} from "../api/admin";
import RoleRequestsDetail from "../components/overlays/role_requests_detail";
import ReportsDetail from "../components/overlays/reports_detail";

const role = "admin";
const MUSCLE_GROUPS = ["Chest", "Back", "Shoulders", "Legs", "Arms", "Core", "Cardio"];
const EQUIPMENT = ["Barbell", "Dumbbell", "Cable", "Machine", "Bodyweight"];
const USERS_PER_PAGE = 10;
const EXERCISES_PER_PAGE = 10;

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
  const maxVal = Math.max(...data.map((d) => d[valueKey]));

  return (
    <div ref={ref} className="relative" style={{ height }}>
      <div className="flex items-end justify-between gap-1 h-full px-1">
        {data.map((d, i) => {
          const pct = animated ? (d[valueKey] / maxVal) * 100 : 0;
          const secPct = secondaryKey && animated ? (d[secondaryKey] / maxVal) * 100 : 0;
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
              {/* Bars */}
              <div className="w-full flex gap-0.5 items-end justify-center" style={{ height: `${height - 24}px` }}>
                <div
                  className="flex-1 rounded-t-sm transition-all duration-700 ease-out max-w-5"
                  style={{
                    height: `${pct}%`,
                    backgroundColor: color,
                    opacity: hoveredIdx === i ? 1 : 0.7,
                    transitionDelay: `${i * 30}ms`,
                  }}
                />
                {secondaryKey && (
                  <div
                    className="flex-1 rounded-t-sm transition-all duration-700 ease-out max-w-5"
                    style={{
                      height: `${secPct}%`,
                      backgroundColor: secondaryColor,
                      opacity: hoveredIdx === i ? 1 : 0.5,
                      transitionDelay: `${i * 30 + 100}ms`,
                    }}
                  />
                )}
              </div>
              <span className="text-[9px] text-gray-600 mt-1 truncate w-full text-center">{d[labelKey]}</span>
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

  /* ── auth guard ──────────────────────────────────────────────────── */
  const [authed, setAuthed] = useState(false);
  useEffect(() => {
    const token = localStorage.getItem("jwt");
    if (!token) { navigate("/login"); return; }
    setAuthed(true);
  }, [navigate]);

  /* ── state ───────────────────────────────────────────────────────── */
  const [initials, setInitials] = useState("?");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [roleRequests, setRoleRequests] = useState([]);
  const [reports, setReports] = useState([]);

  /* ── overlay state ───────────────────────────────────────────────── */
  const [overlay, setOverlay] = useState(null);
  const closeOverlay = () => setOverlay(null);

  /* ── user management state ───────────────────────────────────────── */
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("all");
  const [userStatusFilter, setUserStatusFilter] = useState("all");
  const [userPage, setUserPage] = useState(1);

  /* ── exercise bank state ─────────────────────────────────────────── */
  const [exSearch, setExSearch] = useState("");
  const [exGroupFilter, setExGroupFilter] = useState("All");
  const [exPage, setExPage] = useState(1);
  const [editingExercise, setEditingExercise] = useState(null);
  const [newExercise, setNewExercise] = useState(null);

  /* ── analytics state ─────────────────────────────────────────────── */
  const [analyticsPeriod, setAnalyticsPeriod] = useState("daily");

  /* ── data loading ────────────────────────────────────────────────── */
  useEffect(() => {
    if (!authed) return;
    (async () => {
      try {
        const me = await fetchMe();
        if (me?.name) setInitials(me.name.split(" ").map((n) => n[0]).join("").toUpperCase());
      } catch {}

      const [s, u, ex, an, requests] = await Promise.all([
        fetchAdminStats(),
        fetchAllUsers(),
        fetchExerciseBank(),
        fetchAnalytics(),
        fetchCoachRequests(),
      ]);
      setStats(s);
      setUsers(u);
      setExercises(ex);
      setAnalytics(an);
      setRoleRequests(requests);
      setReports([
        { id: 1, reporter_name: "Aisha Patel",  reported_name: "Coach X", reason: "Inappropriate content", created_at: "1 hr ago" },
        { id: 2, reporter_name: "Chris Nguyen", reported_name: "Coach Y", reason: "No show",               created_at: "3 hrs ago" },
      ]);

      setLoading(false);
    })();
  }, [authed]);

  /* ── handlers ────────────────────────────────────────────────────── */
  const handleApprove = async (id) => {
    await resolveCoachRequest(id, true);
    setRoleRequests((p) => p.map((r) => r.id === id ? { ...r, is_approved: true } : r));
  };

  const handleReject = async (id) => {
    await resolveCoachRequest(id, false);
    setRoleRequests((p) => p.map((r) => r.id === id ? { ...r, is_approved: false } : r));
  };
  const handleDismissReport = (id) => setReports((p) => p.filter((r) => r.id !== id));

  const handleUserStatusChange = async (userId, newStatus) => {
    await updateUserStatus(userId, newStatus);
    setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, status: newStatus } : u));
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm("Permanently delete this account? This cannot be undone.")) return;
    await deleteUser(userId);
    setUsers((prev) => prev.filter((u) => u.id !== userId));
  };

  const handleSaveExercise = async (exercise) => {
    if (exercise.id) {
      await updateExercise(exercise.id, exercise);
      setExercises((prev) => prev.map((e) => e.id === exercise.id ? { ...e, ...exercise } : e));
    } else {
      const result = await createExercise(exercise);
      setExercises((prev) => [...prev, { ...exercise, id: result.id || Date.now(), created_by: "Admin" }]);
    }
    setEditingExercise(null);
    setNewExercise(null);
  };

  const handleDeleteExercise = async (exerciseId) => {
    await deleteExercise(exerciseId);
    setExercises((prev) => prev.filter((e) => e.id !== exerciseId));
  };

  /* ── computed ────────────────────────────────────────────────────── */
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

  const filteredExercises = useMemo(() => {
    return exercises.filter((e) => {
      if (exSearch && !e.name.toLowerCase().includes(exSearch.toLowerCase())) return false;
      if (exGroupFilter !== "All" && e.muscle_group !== exGroupFilter) return false;
      return true;
    });
  }, [exercises, exSearch, exGroupFilter]);

  useEffect(() => { setExPage(1); }, [exSearch, exGroupFilter]);
  const totalExPages = Math.max(1, Math.ceil(filteredExercises.length / EXERCISES_PER_PAGE));
  const paginatedExercises = filteredExercises.slice((exPage - 1) * EXERCISES_PER_PAGE, exPage * EXERCISES_PER_PAGE);

  const activeAnalytics = analytics?.[analyticsPeriod] ?? [];
  const summary = analytics?.summary ?? {};

  /* ── loading skeleton ────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="min-h-screen bg-[#080D19]">
        <Navbar role={role} userName="?" />
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
      <Navbar role={role} userName={initials} />

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-8">

        {/* ═══════════════════════════════════════════════════════════════
            OVERVIEW STATS
            ═══════════════════════════════════════════════════════════════ */}
        <SectionHeader label="OVERVIEW" role={role} />

        <div className="grid grid-cols-4 gap-4">
          <div className="bg-[#0E1628] rounded-2xl p-4 flex flex-col justify-between">
            <p className="text-[10px] text-gray-500 uppercase tracking-widest">TOTAL ACCOUNTS</p>
            <p className="text-2xl font-bold text-white mt-1"><AnimatedNumber value={stats?.total_accounts ?? 0} /></p>
            <Sparkline data={activeAnalytics.map((d) => d.active_users)} color="#EF4444" />
          </div>
          <div className="bg-[#0E1628] rounded-2xl p-4 flex flex-col justify-between">
            <p className="text-[10px] text-gray-500 uppercase tracking-widest">ACTIVE CLIENTS</p>
            <p className="text-2xl font-bold text-white mt-1"><AnimatedNumber value={stats?.total_clients ?? 0} /></p>
            <p className="text-xs text-red-400 mt-1">across all coaches</p>
          </div>
          <div className="bg-[#0E1628] rounded-2xl p-4 flex flex-col justify-between">
            <p className="text-[10px] text-gray-500 uppercase tracking-widest">ACTIVE COACHES</p>
            <p className="text-2xl font-bold text-white mt-1"><AnimatedNumber value={stats?.total_coaches ?? 0} /></p>
            <p className="text-xs text-red-400 mt-1">on the platform</p>
          </div>
          <div className="bg-[#0E1628] rounded-2xl p-4 flex flex-col justify-between">
            <p className="text-[10px] text-gray-500 uppercase tracking-widest">PENDING REQUESTS</p>
            <p className="text-2xl font-bold text-white mt-1"><AnimatedNumber value={stats?.pending_role_requests ?? 0} /></p>
            <p className="text-xs text-red-400 mt-1">awaiting approval</p>
          </div>
        </div>

        {/* Revenue & Cashflow */}
        <div className="grid grid-cols-3 gap-4">
          {/* Total Revenue — feature card */}
          <div className="bg-[#0E1628] rounded-2xl p-5 relative overflow-hidden">
            <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-green-500/5 blur-2xl" />
            <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">TOTAL REVENUE</p>
            <p className="text-3xl font-bold text-white">
              $<AnimatedNumber value={stats?.total_revenue ?? 0} duration={1500} />
            </p>
            <p className="text-xs text-gray-500 mt-1">All-time platform earnings</p>
            <div className="mt-3">
              <Sparkline data={activeAnalytics.map((d) => d.active_users * 28 + d.new_signups * 50)} color="#22C55E" />
            </div>
          </div>

          {/* Monthly Revenue */}
          <div className="bg-[#0E1628] rounded-2xl p-5 relative overflow-hidden">
            <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-blue-500/5 blur-2xl" />
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] text-gray-500 uppercase tracking-widest">THIS MONTH</p>
              {stats?.revenue_change != null && (
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${stats.revenue_change >= 0 ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
                  {stats.revenue_change >= 0 ? "↑" : "↓"} {Math.abs(stats.revenue_change)}%
                </span>
              )}
            </div>
            <p className="text-3xl font-bold text-white">
              $<AnimatedNumber value={stats?.revenue_this_month ?? 0} duration={1500} />
            </p>
            <p className="text-xs text-gray-500 mt-1">Compared to last month</p>
            <div className="mt-3 flex items-end gap-[3px] h-[32px]">
              {[38, 52, 45, 60, 72, 55, 68, 82, 74, 90, 85, 95].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-sm transition-all"
                  style={{
                    height: `${(h / 100) * 32}px`,
                    backgroundColor: i === 11 ? "#3B82F6" : "rgba(59,130,246,0.15)",
                  }}
                />
              ))}
            </div>
          </div>

          {/* Active Subscriptions */}
          <div className="bg-[#0E1628] rounded-2xl p-5 relative overflow-hidden">
            <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-orange-500/5 blur-2xl" />
            <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">ACTIVE SUBSCRIPTIONS</p>
            <p className="text-3xl font-bold text-white">
              <AnimatedNumber value={stats?.active_subscriptions ?? 0} duration={1500} />
            </p>
            <p className="text-xs text-gray-500 mt-1">Paying clients this cycle</p>
            <div className="mt-3 flex items-center gap-3">
              <div className="flex-1 h-2 bg-[#0A1020] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-orange-500 to-orange-400 transition-all duration-1000"
                  style={{ width: `${Math.min(100, Math.round(((stats?.active_subscriptions ?? 0) / Math.max(1, stats?.total_clients ?? 1)) * 100))}%` }}
                />
              </div>
              <span className="text-[10px] text-orange-400 font-semibold whitespace-nowrap">
                {Math.round(((stats?.active_subscriptions ?? 0) / Math.max(1, stats?.total_clients ?? 1)) * 100)}% of clients
              </span>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            ENGAGEMENT ANALYTICS
            ═══════════════════════════════════════════════════════════════ */}
        <SectionHeader label="ENGAGEMENT ANALYTICS" role={role} />

        {/* KPI cards */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "DAU", value: summary.dau, change: summary.dau_change, sub: "Daily Active Users" },
            { label: "WAU", value: summary.wau, change: summary.wau_change, sub: "Weekly Active Users" },
            { label: "MAU", value: summary.mau, change: summary.mau_change, sub: "Monthly Active Users" },
          ].map((kpi) => (
            <div key={kpi.label} className="bg-[#0E1628] rounded-2xl p-5 relative overflow-hidden">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] text-gray-500 uppercase tracking-widest">{kpi.label}</p>
                {kpi.change != null && (
                  <span className={`text-xs font-semibold ${kpi.change >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {kpi.change >= 0 ? "↑" : "↓"} {Math.abs(kpi.change)}%
                  </span>
                )}
              </div>
              <p className="text-3xl font-bold text-white">
                <AnimatedNumber value={kpi.value ?? 0} duration={1500} />
              </p>
              <p className="text-xs text-gray-500 mt-1">{kpi.sub}</p>
              {/* Background glow */}
              <div className="absolute -bottom-4 -right-4 w-24 h-24 rounded-full opacity-5 bg-red-500 blur-2xl" />
            </div>
          ))}
        </div>

        {/* Extra stats row */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-[#0E1628] rounded-2xl p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center text-red-400 text-lg">📊</div>
            <div>
              <p className="text-white font-bold text-lg"><AnimatedNumber value={summary.total_signups_30d ?? 0} /></p>
              <p className="text-gray-500 text-xs">New signups (30d)</p>
            </div>
          </div>
          <div className="bg-[#0E1628] rounded-2xl p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 text-lg">⏱</div>
            <div>
              <p className="text-white font-bold text-lg"><AnimatedNumber value={summary.avg_session_min ?? 0} /> min</p>
              <p className="text-gray-500 text-xs">Avg session duration</p>
            </div>
          </div>
          <div className="bg-[#0E1628] rounded-2xl p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center text-green-400 text-lg">🔄</div>
            <div>
              <p className="text-white font-bold text-lg"><AnimatedNumber value={summary.retention_7d ?? 0} />%</p>
              <p className="text-gray-500 text-xs">7-day retention</p>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-3 gap-4">
          {/* Bar chart — 2 cols */}
          <div className="col-span-2 bg-[#0E1628] rounded-2xl p-5">
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
            <div className="flex gap-4 mb-3 text-[10px]">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-red-500 inline-block" /> Active Users</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-blue-500 inline-block" /> New Signups</span>
            </div>
            <BarChart
              data={activeAnalytics}
              labelKey="label"
              valueKey="active_users"
              secondaryKey="new_signups"
              color="#EF4444"
              secondaryColor="#3B82F6"
              height={180}
            />
          </div>

          {/* Donut — Clients & Coaches only */}
          <div className="bg-[#0E1628] rounded-2xl p-5 flex flex-col items-center justify-center">
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
                <option value="suspended">Suspended</option>
                <option value="deactivated">Deactivated</option>
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
                      variant={user.status === "active" ? "success" : user.status === "suspended" ? "warning" : "neutral"}
                      dot
                    />
                  </div>
                  <span className="col-span-2 text-gray-500 text-xs">{user.last_active}</span>
                  <div className="col-span-2 flex justify-end gap-2">
                    {user.status === "active" ? (
                      <button
                        onClick={() => handleUserStatusChange(user.id, "suspended")}
                        className="text-[10px] px-3 py-1.5 rounded-lg border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10 transition-colors"
                      >
                        Suspend
                      </button>
                    ) : user.status === "suspended" ? (
                      <>
                        <button
                          onClick={() => handleUserStatusChange(user.id, "active")}
                          className="text-[10px] px-3 py-1.5 rounded-lg border border-green-500/30 text-green-400 hover:bg-green-500/10 transition-colors"
                        >
                          Reactivate
                        </button>
                        <button
                          onClick={() => handleUserStatusChange(user.id, "deactivated")}
                          className="text-[10px] px-3 py-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          Deactivate
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleUserStatusChange(user.id, "active")}
                        className="text-[10px] px-3 py-1.5 rounded-lg border border-green-500/30 text-green-400 hover:bg-green-500/10 transition-colors"
                      >
                        Reactivate
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
            EXERCISE BANK
            ═══════════════════════════════════════════════════════════════ */}
        <SectionHeader label="EXERCISE BANK" role={role} />

        <div className="bg-[#0E1628] rounded-2xl border border-white/5 overflow-hidden">
          {/* Search, filter, + add */}
          <div className="p-5 border-b border-white/5">
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="Search exercises..."
                value={exSearch}
                onChange={(e) => setExSearch(e.target.value)}
                className="flex-1 bg-[#0A1020] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none"
              />
              <select
                value={exGroupFilter}
                onChange={(e) => setExGroupFilter(e.target.value)}
                className="bg-[#0A1020] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-gray-300 focus:outline-none"
              >
                <option value="All">All Groups</option>
                {MUSCLE_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
              <button
                onClick={() => setNewExercise({ name: "", muscle_group: "Chest", equipment: "Barbell" })}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Add Exercise
              </button>
            </div>
            <p className="text-gray-500 text-xs mt-2">{filteredExercises.length} exercise{filteredExercises.length !== 1 ? "s" : ""} in bank</p>
          </div>

          {/* Add/Edit inline form */}
          {(newExercise || editingExercise) && (
            <div className="p-5 border-b border-white/5 bg-[#0A1020]/50">
              <ExerciseForm
                initial={newExercise || editingExercise}
                onSave={handleSaveExercise}
                onCancel={() => { setNewExercise(null); setEditingExercise(null); }}
              />
            </div>
          )}

          {/* Exercise list */}
          <div className="divide-y divide-white/5">
            <div className="grid grid-cols-12 gap-4 px-5 py-2.5 text-[10px] text-gray-500 uppercase tracking-widest">
              <span className="col-span-4">Exercise</span>
              <span className="col-span-2">Muscle Group</span>
              <span className="col-span-2">Equipment</span>
              <span className="col-span-2">Added By</span>
              <span className="col-span-2 text-right">Actions</span>
            </div>

            {filteredExercises.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8">No exercises match your filters</p>
            ) : (
              paginatedExercises.map((ex) => (
                <div key={ex.id} className="grid grid-cols-12 gap-4 px-5 py-3 items-center hover:bg-white/[0.02] transition-colors">
                  <span className="col-span-4 text-white text-sm font-medium">{ex.name}</span>
                  <div className="col-span-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-red-500/10 text-red-400">{ex.muscle_group}</span>
                  </div>
                  <span className="col-span-2 text-gray-400 text-sm">{ex.equipment}</span>
                  <span className="col-span-2 text-gray-500 text-xs">{ex.created_by}</span>
                  <div className="col-span-2 flex justify-end gap-2">
                    <button
                      onClick={() => setEditingExercise({ ...ex })}
                      className="text-[10px] px-3 py-1.5 rounded-lg border border-white/10 text-gray-300 hover:bg-white/5 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteExercise(ex.id)}
                      className="text-[10px] px-3 py-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Exercise pagination */}
          {totalExPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-white/5">
              <p className="text-gray-500 text-xs">
                Showing {(exPage - 1) * EXERCISES_PER_PAGE + 1}–{Math.min(exPage * EXERCISES_PER_PAGE, filteredExercises.length)} of {filteredExercises.length}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setExPage((p) => Math.max(1, p - 1))}
                  disabled={exPage === 1}
                  className="text-[10px] px-2.5 py-1.5 rounded-lg border border-white/10 text-gray-400 hover:bg-white/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  ← Prev
                </button>
                {Array.from({ length: totalExPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setExPage(page)}
                    className={`text-[10px] min-w-[28px] py-1.5 rounded-lg border transition-colors ${
                      page === exPage
                        ? "border-red-500/50 bg-red-500/10 text-red-400"
                        : "border-white/10 text-gray-500 hover:bg-white/5"
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => setExPage((p) => Math.min(totalExPages, p + 1))}
                  disabled={exPage === totalExPages}
                  className="text-[10px] px-2.5 py-1.5 rounded-lg border border-white/10 text-gray-400 hover:bg-white/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>

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
                  key={report.id}
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
        <RoleRequestsDetail requests={roleRequests} onApprove={handleApprove} onReject={handleReject} />
      </Overlay>

      <Overlay open={overlay === "reports"} onClose={closeOverlay} title="Active Reports" wide>
        <ReportsDetail reports={reports} onDismiss={handleDismissReport} />
      </Overlay>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   EXERCISE FORM — inline add/edit for exercise bank
   ═══════════════════════════════════════════════════════════════════════ */

function ExerciseForm({ initial, onSave, onCancel }) {
  const [name, setName] = useState(initial.name ?? "");
  const [muscleGroup, setMuscleGroup] = useState(initial.muscle_group ?? "Chest");
  const [equipment, setEquipment] = useState(initial.equipment ?? "Barbell");

  return (
    <div className="flex gap-3 items-end">
      <div className="flex-1">
        <label className="text-[10px] text-gray-500 uppercase tracking-widest">Exercise Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Bulgarian Split Squat"
          className="w-full bg-[#080D19] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none mt-1"
          autoFocus
        />
      </div>
      <div>
        <label className="text-[10px] text-gray-500 uppercase tracking-widest">Muscle Group</label>
        <select
          value={muscleGroup}
          onChange={(e) => setMuscleGroup(e.target.value)}
          className="w-full bg-[#080D19] border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none mt-1"
        >
          {MUSCLE_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
      </div>
      <div>
        <label className="text-[10px] text-gray-500 uppercase tracking-widest">Equipment</label>
        <select
          value={equipment}
          onChange={(e) => setEquipment(e.target.value)}
          className="w-full bg-[#080D19] border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none mt-1"
        >
          {EQUIPMENT.map((e) => <option key={e} value={e}>{e}</option>)}
        </select>
      </div>
      <button
        onClick={() => name.trim() && onSave({ ...initial, name: name.trim(), muscle_group: muscleGroup, equipment })}
        disabled={!name.trim()}
        className="px-5 py-2 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-40"
      >
        {initial.id ? "Update" : "Add"}
      </button>
      <button
        onClick={onCancel}
        className="px-4 py-2 rounded-lg text-sm border border-white/10 text-gray-400 hover:bg-white/5 transition-colors"
      >
        Cancel
      </button>
    </div>
  );
}
