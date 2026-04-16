import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
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
  SkeletonGreeting,
  SkeletonAvailability,
} from "../components";
import { fetchMe } from "../api/client";
import {
  fetchCoachStats,
  fetchMyClients,
  fetchUpcomingSessions,
  fetchCoachAvailability,
  fetchCoachReviews,
  fetchCoachWorkoutPlans,
  saveCoachAvailability,
} from "../api/coach";
import ClientsDetail from "../components/overlays/clients_detail";
import SessionsDetail from "../components/overlays/sessions_detail";
import ReviewsDetail from "../components/overlays/reviews_detail";
import AvailabilityDetail from "../components/overlays/availability_detail";

const role = "coach";
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const SlotCell = ({ status, time }) => {
  const base = "rounded py-1 text-center text-[10px] font-medium transition-colors";
  if (status === "booked")
    return <div className={`${base} bg-blue-900/60 text-blue-300`}>{time}</div>;
  if (status === "available")
    return <div className={`${base} bg-orange-900/60 text-orange-300`}>{time}</div>;
  return <div className={`${base} bg-[#0A1020] text-gray-700`}>—</div>;
};

export default function CoachDashboard() {
  const navigate = useNavigate();

  /* ── auth guard ──────────────────────────────────────────────────── */
  const [authed, setAuthed] = useState(false);
  useEffect(() => {
    const token = localStorage.getItem("jwt");
    if (!token) { navigate("/login"); return; }
    setAuthed(true);
  }, [navigate]);

  /* ── overlay ─────────────────────────────────────────────────────── */
  const [overlay, setOverlay] = useState(null);
  const closeOverlay = () => setOverlay(null);

  /* ── state ───────────────────────────────────────────────────────── */
  const [account, setAccount] = useState(null);
  const [coachId, setCoachId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [clients, setClients] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [availability, setAvailability] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [workoutPlans, setWorkoutPlans] = useState([]);

  /* ── load account ────────────────────────────────────────────────── */
  useEffect(() => {
    if (!authed) return;
    (async () => {
      try {
        const me = await fetchMe();
        setAccount(me);
        if (me.coach_id) setCoachId(me.coach_id);
      } catch { /* redirect handled */ }
      finally { setLoading(false); }
    })();
  }, [authed]);

  /* ── load dashboard data ─────────────────────────────────────────── */
  useEffect(() => {
    if (!coachId) return;
    (async () => {
      const [s, c, sess, avail, rev, plans] = await Promise.all([
        fetchCoachStats(coachId),
        fetchMyClients(coachId),
        fetchUpcomingSessions(coachId),
        fetchCoachAvailability(coachId),
        fetchCoachReviews(coachId),
        fetchCoachWorkoutPlans(coachId),
      ]);
      setStats(s);
      setClients(c);
      setSessions(sess);
      setAvailability(avail);
      setReviews(rev);
      setWorkoutPlans(plans);
    })();
  }, [coachId]);

  /* ── derived ─────────────────────────────────────────────────────── */
  const initials = account?.name
    ? account.name.split(" ").map((n) => n[0]).join("").toUpperCase()
    : "?";
  const nameParts = (account?.name ?? "").split(" ");
  const firstName = nameParts[0] || "—";
  const lastName = nameParts.slice(1).join(" ") || "";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";
  const todaySessions = sessions.filter((s) => {
    const dayNames = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
    return s.weekday === dayNames[new Date().getDay()];
  });

  /* ── loading skeleton ────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: "#080D19" }}>
        <Navbar role={role} userName="?" />
        <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
          <div className="h-5 w-40 bg-white/5 rounded animate-pulse" />
          <div className="grid grid-cols-4 gap-4">
            <SkeletonGreeting />
            <SkeletonStatCard />
            <SkeletonStatCard />
            <SkeletonStatCard />
          </div>
          <div className="h-5 w-40 bg-white/5 rounded animate-pulse" />
          <div className="grid grid-cols-3 gap-4">
            <SkeletonDashCard rows={4} />
            <SkeletonDashCard rows={3} />
            <SkeletonAvailability />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#080D19" }}>
      <Navbar role={role} userName={initials} />

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">

        {/* ─── OVERVIEW ───────────────────────────────────────────── */}
        <SectionHeader label="OVERVIEW" role={role} />

        <div className="grid grid-cols-4 gap-4">
          <DashboardCard role={role} className="min-h-50">
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">{greeting}</p>
            <h2 className="text-4xl font-bold text-white leading-tight">
              {firstName}
              {lastName && <><br />{lastName}</>}
            </h2>
            <p className="text-orange-400/80 text-xs mt-2">Coach Dashboard</p>
          </DashboardCard>

          <StatCard
            role={role}
            label="ACTIVE CLIENTS"
            value={stats?.active_clients ?? "—"}
            sub={`${stats?.total_clients ?? 0} total`}
          />
          <StatCard
            role={role}
            label="SESSIONS THIS WEEK"
            value={stats?.sessions_this_week ?? "—"}
            sub={`${todaySessions.length} today`}
          />
          <StatCard
            role={role}
            label="AVG RATING"
            value={stats?.avg_rating ? `★ ${stats.avg_rating}` : "—"}
            sub={stats?.review_count ? `${stats.review_count} reviews` : "no reviews"}
          />
        </div>

        {/* ─── CLIENTS & SESSIONS ─────────────────────────────────── */}
        <SectionHeader label="CLIENTS & SESSIONS" role={role} />

        <div className="grid grid-cols-3 gap-4 items-stretch">
          {/* My Clients */}
          <DashboardCard
            role={role}
            title={`My Clients (${clients.length})`}
            action={{ label: "View all", onClick: () => setOverlay("clients") }}
          >
            <div className="space-y-2">
              {clients.slice(0, 4).map((c) => (
                <ListRow
                  key={c.id}
                  label={c.name}
                  sub={c.goal}
                  right={
                    <StatusBadge
                      label={c.status}
                      variant={c.status === "active" ? "success" : "neutral"}
                      dot
                    />
                  }
                />
              ))}
              {clients.length > 4 && (
                <p className="text-gray-500 text-xs text-center pt-1">+{clients.length - 4} more</p>
              )}
            </div>
          </DashboardCard>

          {/* Upcoming Sessions */}
          <DashboardCard
            role={role}
            title="Upcoming Sessions"
            action={{ label: "View all", onClick: () => setOverlay("sessions") }}
          >
            <div className="space-y-2">
              {sessions.slice(0, 4).map((s) => (
                <ListRow
                  key={s.id}
                  label={s.client_name}
                  sub={`${s.weekday} · ${s.start_time}`}
                  right={
                    <span className="text-orange-400/80 text-xs font-medium">{s.type}</span>
                  }
                />
              ))}
              {sessions.length > 4 && (
                <p className="text-gray-500 text-xs text-center pt-1">+{sessions.length - 4} more</p>
              )}
            </div>
          </DashboardCard>

          {/* Availability */}
          <DashboardCard
            role={role}
            title="My Availability"
            action={{ label: "Edit", onClick: () => setOverlay("availability") }}
          >
            <div className="grid grid-cols-8 gap-1 mb-2">
              <div />
              {WEEKDAYS.map((d) => (
                <div key={d} className="text-[10px] text-gray-500 text-center font-medium">{d}</div>
              ))}
            </div>
            {availability.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-6">No availability set</p>
            ) : (
              availability.map(({ time, slots }) => (
                <div key={time} className="grid grid-cols-8 gap-1 mb-1">
                  <div className="text-[10px] text-gray-500 flex items-center">{time}</div>
                  {slots.map((status, i) => (
                    <SlotCell key={i} status={status} time={time} />
                  ))}
                </div>
              ))
            )}
            <div className="flex gap-4 mt-3">
              {[
                { color: "bg-orange-400", label: "Available" },
                { color: "bg-blue-400", label: "Booked" },
                { color: "bg-gray-600", label: "Unavailable" },
              ].map(({ color, label }) => (
                <span key={label} className="flex items-center gap-1.5 text-[10px] text-gray-400">
                  <span className={`w-2 h-2 rounded-full ${color}`} />
                  {label}
                </span>
              ))}
            </div>
          </DashboardCard>
        </div>

        {/* ─── PLANS & REVIEWS ────────────────────────────────────── */}
        <SectionHeader label="PLANS & REVIEWS" role={role} />

        <div className="grid grid-cols-2 gap-4">
          {/* Workout Plans */}
          <DashboardCard
            role={role}
            title="Workout Plans"
            footer={
              <button
                onClick={() => navigate("/workouts?role=coach")}
                className="w-full py-2 rounded-xl border border-orange-500/30 text-orange-400 text-xs font-semibold hover:bg-orange-500/10 transition-colors"
              >
                Manage & Assign Workouts
              </button>
            }
          >
            <div className="space-y-2">
              {workoutPlans.map((plan) => (
                <ListRow
                  key={plan.id}
                  label={plan.strata_name}
                  sub={`${plan.client_count} client${plan.client_count !== 1 ? "s" : ""} · Updated ${plan.last_updated}`}
                  right={
                    <span className="text-orange-400 text-xs font-medium">Edit →</span>
                  }
                />
              ))}
            </div>
          </DashboardCard>

          {/* Reviews */}
          <DashboardCard
            role={role}
            title="Client Reviews"
            action={{ label: "View all", onClick: () => setOverlay("reviews") }}
          >
            <div className="space-y-2">
              {reviews.slice(0, 3).map((r) => (
                <div key={r.id} className="rounded-xl bg-[#0A1020] px-4 py-3">
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-white text-sm font-medium">{r.client_name}</p>
                    <p className="text-yellow-400 text-xs">{"★".repeat(r.rating)}</p>
                  </div>
                  <p className="text-gray-400 text-xs truncate">{r.comment}</p>
                </div>
              ))}
            </div>
          </DashboardCard>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          OVERLAYS
          ═══════════════════════════════════════════════════════════════ */}

      <Overlay open={overlay === "clients"} onClose={closeOverlay} title="My Clients" wide>
        <ClientsDetail
          clients={clients}
          onMessage={(id) => { closeOverlay(); navigate(`/chat?client=${id}`); }}
        />
      </Overlay>

      <Overlay open={overlay === "sessions"} onClose={closeOverlay} title="Upcoming Sessions" wide>
        <SessionsDetail sessions={sessions} />
      </Overlay>

      <Overlay open={overlay === "availability"} onClose={closeOverlay} title="My Availability" wide>
        <AvailabilityDetail
          slots={availability}
          weekdays={WEEKDAYS}
          role="coach"
          onSave={async (updatedSlots) => {
            await saveCoachAvailability(coachId, updatedSlots);
            setAvailability(updatedSlots);
          }}
        />
      </Overlay>

      <Overlay open={overlay === "reviews"} onClose={closeOverlay} title="Client Reviews">
        <ReviewsDetail
          reviews={reviews}
          avgRating={stats?.avg_rating}
          totalCount={stats?.review_count}
        />
      </Overlay>
    </div>
  );
}
