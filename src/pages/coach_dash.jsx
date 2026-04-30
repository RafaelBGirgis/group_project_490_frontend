import { useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
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
  fetchCoachProfile,
  fetchCoachStats,
  fetchMyClients,
  fetchUpcomingSessions,
  fetchCoachAvailability,
  fetchCoachReviews,
  fetchCoachWorkoutPlans,
  saveCoachAvailability,
  fetchClientRequests,
  lookupClient,
  acceptClientRequest,
  cacheAcceptedClientForCoach,
  denyClientRequest,
  createClientReview,
  fetchClientReports,
} from "../api/coach";
import { cacheConversationForAccount, createConversation } from "../api/chat";
import { getCoachAccessState } from "../utils/roleAccess";
import { updateClientCoachRequestByRequestId } from "../utils/coachRequests";
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
  const [coachProfile, setCoachProfile] = useState(null);
  const [coachId, setCoachId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [clients, setClients] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [availability, setAvailability] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [workoutPlans, setWorkoutPlans] = useState([]);
  const [clientRequests, setClientRequests] = useState([]);
  const [clientRequestDetails, setClientRequestDetails] = useState({});
  const [requestActionId, setRequestActionId] = useState(null);
  const [clientReportDrafts, setClientReportDrafts] = useState({});
  const [clientReports, setClientReports] = useState({});
  const [availabilityError, setAvailabilityError] = useState("");

  /* ── load account ────────────────────────────────────────────────── */
  useEffect(() => {
    if (!authed) return;
    (async () => {
      try {
        const me = await fetchMe();
        const coachAccess = await getCoachAccessState(me);
        if (!coachAccess.canAccessCoach) {
          navigate("/profile");
          return;
        }
        setAccount(me);
        if (me.coach_id) setCoachId(me.coach_id);
      } catch { /* redirect handled */ }
      finally { setLoading(false); }
    })();
  }, [authed, navigate]);

  /* ── load dashboard data ─────────────────────────────────────────── */
  useEffect(() => {
    if (!coachId) return;
    (async () => {
      const [profile, s, c, sess, avail, rev, plans] = await Promise.all([
        fetchCoachProfile().catch(() => null),
        fetchCoachStats(coachId),
        fetchMyClients(coachId),
        fetchUpcomingSessions(coachId),
        fetchCoachAvailability(coachId),
        fetchCoachReviews(coachId),
        fetchCoachWorkoutPlans(coachId),
      ]);
      setCoachProfile(profile);
      setStats(s);
      setClients(c);
      setSessions(sess);
      setAvailability(avail);
      setReviews(rev);
      setWorkoutPlans(plans);

      try {
        const requests = await fetchClientRequests();
      setClientRequests(requests);
    } catch {
      setClientRequests([]);
    }
  })();
}, [coachId]);

  const loadClientRequestDetails = useCallback(async (clientId) => {
    if (clientRequestDetails[clientId]) return clientRequestDetails[clientId];
    const detail = await lookupClient(clientId);
    setClientRequestDetails((prev) => ({ ...prev, [clientId]: detail }));
    try {
      const reportsResponse = await fetchClientReports(clientId);
      setClientReports((prev) => ({
        ...prev,
        [clientId]: Array.isArray(reportsResponse?.reports) ? reportsResponse.reports : [],
      }));
    } catch {
      setClientReports((prev) => ({ ...prev, [clientId]: [] }));
    }
    return detail;
  }, [clientRequestDetails]);

  const handleAcceptRequest = async (request) => {
    setRequestActionId(request.request_id);
    try {
      const accepted = await acceptClientRequest(request.request_id);
      if (accepted?.relationship_id) {
        const alreadyTrackedClient = clients.some((client) => Number(client.id) === Number(request.client_id));
        const alreadyActiveClient = clients.some(
          (client) => Number(client.id) === Number(request.client_id) && client.status === "active"
        );
        localStorage.setItem(
          `client_relationship:${request.client_id}:${coachId}`,
          String(accepted.relationship_id)
        );
        const detail = await loadClientRequestDetails(request.client_id).catch(() => null);
        const conversation = await createConversation(accepted.relationship_id, {
          id: request.client_id,
          name: detail?.base_account?.name || `Client #${request.client_id}`,
          role: "client",
        }, {
          accountId: account?.id || coachId,
          role: "coach",
        }).catch(() => null);
        if (conversation) {
          cacheConversationForAccount(
            {
              id: conversation.id,
              partner_id: coachId,
              partner_name: account?.name || "Coach",
              partner_role: "coach",
              last_message: conversation.last_message || "",
              last_message_at: conversation.last_message_at || "",
              unread_count: conversation.unread_count || 0,
            },
            { accountId: detail?.base_account?.id || request.client_id, role: "client" }
          );
        }
        updateClientCoachRequestByRequestId(request.request_id, {
          status: "approved",
          relationship_id: accepted.relationship_id,
        });

        const acceptedClient = {
          id: request.client_id,
          request_id: request.request_id,
          name: detail?.base_account?.name || `Client #${request.client_id}`,
          goal: detail?.fitness_goals?.[0]?.goal_enum || "Active client",
          status: "active",
          joined: new Date().toLocaleDateString(),
          relationship_id: accepted.relationship_id,
          details: detail,
        };

        cacheAcceptedClientForCoach(coachId, acceptedClient);
        setClients((prev) => {
          const next = [
            acceptedClient,
            ...prev.filter((client) => Number(client.id) !== Number(request.client_id)),
          ];
          return next;
        });
        setStats((prev) =>
          prev
            ? {
                ...prev,
                total_clients: prev.total_clients + (alreadyTrackedClient ? 0 : 1),
                active_clients: prev.active_clients + (alreadyActiveClient ? 0 : 1),
              }
            : prev
        );
      }
      setClientRequests((prev) => prev.filter((item) => item.request_id !== request.request_id));
    } finally {
      setRequestActionId(null);
    }
  };

  const handleDenyRequest = async (requestId) => {
    setRequestActionId(requestId);
    try {
      await denyClientRequest(requestId);
      updateClientCoachRequestByRequestId(requestId, { status: "rejected" });
      setClientRequests((prev) => prev.filter((item) => item.request_id !== requestId));
    } finally {
      setRequestActionId(null);
    }
  };

  const handleSubmitClientReport = async (clientId) => {
    const draft = clientReportDrafts[clientId];
    if (!draft?.trim()) return;
    setRequestActionId(clientId);
    try {
      await createClientReview(clientId, draft.trim());
      const reportsResponse = await fetchClientReports(clientId);
      setClientReports((prev) => ({
        ...prev,
        [clientId]: Array.isArray(reportsResponse?.reports) ? reportsResponse.reports : [],
      }));
      setClientReportDrafts((prev) => ({ ...prev, [clientId]: "" }));
    } finally {
      setRequestActionId(null);
    }
  };

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
            <p className="text-orange-400/80 text-xs mt-2">
              Coach Dashboard{coachProfile?.coach_account?.verified ? " · Verified" : ""}
            </p>
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

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 items-stretch">
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
            {availabilityError ? (
              <div className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                {availabilityError}
              </div>
            ) : null}
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

          <DashboardCard
            role={role}
            title={`Client Requests (${clientRequests.length})`}
            action={{ label: "Manage", onClick: () => setOverlay("requests") }}
          >
            <div className="space-y-2">
              {clientRequests.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-6">No pending requests</p>
              ) : (
                clientRequests.slice(0, 4).map((request) => (
                  <ListRow
                    key={request.request_id}
                    label={`Client #${request.client_id}`}
                    sub={`Request ${request.request_id}`}
                    right={<StatusBadge label="Pending" variant="warning" dot />}
                  />
                ))
              )}
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
          onMessage={(id) => { closeOverlay(); navigate(`/coach-chat?client=${id}`); }}
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
            setAvailabilityError("");
            try {
              const refreshedAvailability = await saveCoachAvailability(coachId, updatedSlots);
              setAvailability(refreshedAvailability);
            } catch (error) {
              setAvailabilityError(error.message || "Unable to save coach availability.");
              throw error;
            }
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

      <Overlay open={overlay === "requests"} onClose={closeOverlay} title="Client Requests" wide>
        <div className="space-y-4">
          {clientRequests.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">No pending client requests.</p>
          ) : (
            clientRequests.map((request) => {
              const detail = clientRequestDetails[request.client_id];
              const reports = clientReports[request.client_id] || [];
              return (
                <div key={request.request_id} className="rounded-2xl border border-white/8 bg-[#0B1120] p-4 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-white font-semibold">
                        {detail?.base_account?.name || `Client #${request.client_id}`}
                      </p>
                      <p className="text-xs text-gray-500">
                        Request #{request.request_id} · Goal {detail?.fitness_goals?.[0]?.goal_enum || "not loaded"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => loadClientRequestDetails(request.client_id)}
                        className="rounded-lg border border-white/10 px-3 py-2 text-xs text-gray-300 hover:bg-white/5"
                      >
                        Load Details
                      </button>
                      <button
                        onClick={() => handleAcceptRequest(request)}
                        disabled={requestActionId === request.request_id}
                        className="rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-xs font-semibold text-green-300 disabled:opacity-60"
                      >
                        {requestActionId === request.request_id ? "Accepting..." : "Accept"}
                      </button>
                      <button
                        onClick={() => handleDenyRequest(request.request_id)}
                        disabled={requestActionId === request.request_id}
                        className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300 disabled:opacity-60"
                      >
                        {requestActionId === request.request_id ? "Denying..." : "Deny"}
                      </button>
                    </div>
                  </div>

                  {detail ? (
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="rounded-xl bg-[#101827] p-3">
                        <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-2">Client Info</p>
                        <div className="space-y-1 text-xs text-gray-300">
                          <p>Email: {detail.base_account?.email || "—"}</p>
                          <p>Age: {detail.base_account?.age ?? "—"}</p>
                          <p>Gender: {detail.base_account?.gender || "—"}</p>
                          <p>Bio: {detail.base_account?.bio || "—"}</p>
                        </div>
                      </div>
                      <div className="rounded-xl bg-[#101827] p-3">
                        <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-2">Client Reports</p>
                        {reports.length === 0 ? (
                          <p className="text-xs text-gray-500">No client reports yet.</p>
                        ) : (
                          <div className="space-y-2">
                            {reports.slice(0, 3).map((report) => (
                              <div key={report.id} className="rounded-lg bg-[#0A1020] px-3 py-2 text-xs text-gray-300">
                                {report.report_summary}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : null}

                  <div className="rounded-xl bg-[#101827] p-3">
                    <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-2">Create Client Report</p>
                    <textarea
                      value={clientReportDrafts[request.client_id] || ""}
                      onChange={(event) =>
                        setClientReportDrafts((prev) => ({
                          ...prev,
                          [request.client_id]: event.target.value,
                        }))
                      }
                      rows={3}
                      placeholder="Add notes about this client."
                      className="w-full rounded-lg border border-white/10 bg-[#080D19] px-3 py-2 text-xs text-white outline-none placeholder:text-gray-600"
                    />
                    <button
                      onClick={() => handleSubmitClientReport(request.client_id)}
                      disabled={requestActionId === request.client_id}
                      className="mt-2 rounded-lg border border-orange-500/30 bg-orange-500/10 px-3 py-2 text-xs font-semibold text-orange-300 disabled:opacity-60"
                    >
                      {requestActionId === request.client_id ? "Submitting..." : "Submit Report"}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Overlay>
    </div>
  );
}
