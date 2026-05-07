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
import ProfileAvatar from "../components/profile_avatar";
import { fetchMe } from "../api/client";
import {
  fetchCoachProfile,
  fetchCoachStats,
  fetchCoachEarnings,
  fetchMyClients,
  fetchUpcomingSessions,
  fetchCoachAvailability,
  fetchCoachReviews,
  fetchCoachWorkoutPlans,
  saveCoachAvailability,
  fetchClientRequests,
  lookupClient,
  acceptClientRequest,
  denyClientRequest,
  terminateRelationship,
  createClientReview,
  fetchClientReports,
} from "../api/coach";
import { getConversationWithAccount } from "../api/chat";
import { getCoachAccessState } from "../utils/roleAccess";
import { resolveRoleState } from "../utils/sessionAuth";
import ClientsDetail from "../components/overlays/clients_detail";
import SessionsDetail from "../components/overlays/sessions_detail";
import ReviewsDetail from "../components/overlays/reviews_detail";
import AvailabilityDetail from "../components/overlays/availability_detail";
import ClientProfile from "../components/overlays/client_profile";

const role = "coach";
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function summarizeAvailability(rows) {
  const safeRows = Array.isArray(rows) ? rows : [];
  const openSlots = safeRows.reduce(
    (sum, row) => sum + (Array.isArray(row.slots) ? row.slots.filter((slot) => slot === "available").length : 0),
    0
  );
  const bookedSlots = safeRows.reduce(
    (sum, row) => sum + (Array.isArray(row.slots) ? row.slots.filter((slot) => slot === "booked").length : 0),
    0
  );
  const activeDays = WEEKDAYS.reduce(
    (sum, _, dayIdx) => sum + (safeRows.some((row) => row.slots?.[dayIdx] === "available") ? 1 : 0),
    0
  );
  return { openSlots, bookedSlots, activeDays };
}

function resolveClientName(source, fallbackId) {
  return (
    source?.base_account?.name ||
    source?.name ||
    source?.client_name ||
    source?.client?.name ||
    `Client #${fallbackId}`
  );
}

function mergeClientDetail(primary, fallback) {
  if (!primary && !fallback) return null;

  const fallbackBase = fallback?.base_account || {};
  const primaryBase = primary?.base_account || {};

  return {
    ...(fallback || {}),
    ...(primary || {}),
    base_account: {
      ...fallbackBase,
      ...primaryBase,
      name:
        primaryBase.name ||
        fallbackBase.name ||
        fallback?.name ||
        primary?.name ||
        "",
      age:
        primaryBase.age ??
        fallbackBase.age ??
        fallback?.age ??
        primary?.age ??
        null,
      gender:
        primaryBase.gender ||
        fallbackBase.gender ||
        fallback?.gender ||
        primary?.gender ||
        "",
      pfp_url:
        primaryBase.pfp_url ||
        fallbackBase.pfp_url ||
        fallback?.pfp_url ||
        primary?.pfp_url ||
        "",
      email:
        primaryBase.email ||
        fallbackBase.email ||
        fallback?.email ||
        primary?.email ||
        "",
      bio:
        primaryBase.bio ||
        fallbackBase.bio ||
        fallback?.bio ||
        primary?.bio ||
        "",
    },
    fitness_goals:
      Array.isArray(primary?.fitness_goals) && primary.fitness_goals.length
        ? primary.fitness_goals
        : Array.isArray(fallback?.fitness_goals)
          ? fallback.fitness_goals
          : [],
  };
}

function hydrateClientRows(rows, detailSources = {}, previousRows = []) {
  return (Array.isArray(rows) ? rows : []).map((row) => {
    const previousRow = previousRows.find((item) => Number(item?.id) === Number(row?.id));
    const sourceDetail =
      row?.details ||
      detailSources?.[row?.id] ||
      previousRow?.details ||
      null;
    const mergedDetail = mergeClientDetail(sourceDetail, row);
    const resolvedName = resolveClientName(
      mergedDetail || previousRow || row,
      row?.id
    );
    const resolvedGoal =
      mergedDetail?.fitness_goals?.[0]?.goal_enum ||
      previousRow?.goal ||
      row?.goal ||
      "Active client";

    return {
      ...row,
      name: resolvedName,
      goal: resolvedGoal,
      details: mergedDetail || row?.details || previousRow?.details || null,
    };
  });
}

function formatCoachEarnings(value) {
  const amount =
    Number(
      value?.total_earnings ??
      value?.amount_paid ??
      value?.earnings ??
      value?.amount ??
      0
    ) || 0;
  return amount.toFixed(2);
}

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

  /*  auth guard  */
  const [authed, setAuthed] = useState(false);
  useEffect(() => {
    setAuthed(true);
  }, [navigate]);

  /*  overlay  */
  const [overlay, setOverlay] = useState(null);
  const closeOverlay = () => setOverlay(null);

  /*  state  */
  const [account, setAccount] = useState(null);
  const [coachProfile, setCoachProfile] = useState(null);
  const [coachId, setCoachId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [earnings, setEarnings] = useState(null);
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
  const [availabilityMessage, setAvailabilityMessage] = useState("");
  const [relationshipActionId, setRelationshipActionId] = useState(null);
  const [canSwitchToAdmin, setCanSwitchToAdmin] = useState(false);
  const [chatActionId, setChatActionId] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);

  /*  load account  */
  useEffect(() => {
    if (!authed) return;
    (async () => {
      try {
        const me = await fetchMe();
        const roleState = await resolveRoleState();
        setCanSwitchToAdmin(roleState.hasAdminRole);
        const coachAccess = await getCoachAccessState(me, roleState);
        if (!coachAccess.canAccessCoach && !roleState.hasAdminRole) {
          navigate("/profile");
          return;
        }
        setAccount(me);
        if (me.coach_id) setCoachId(me.coach_id);
      } catch { /* redirect handled */ }
      finally { setLoading(false); }
    })();
  }, [authed, navigate]);

  /*  load dashboard data  */
  useEffect(() => {
    if (!coachId) return;
    (async () => {
      try {
        const [profile, s, c, sess, avail, rev, plans, earningsResponse] = await Promise.all([
          fetchCoachProfile().catch(() => null),
          fetchCoachStats(coachId).catch(() => null),
          fetchMyClients(coachId).catch(() => []),
          fetchUpcomingSessions(coachId).catch(() => []),
          fetchCoachAvailability(coachId).catch(() => []),
          fetchCoachReviews(coachId).catch(() => []),
          fetchCoachWorkoutPlans(coachId).catch(() => []),
          fetchCoachEarnings().catch(() => null),
        ]);
        const requests = await fetchClientRequests().catch(() => []);
        const detailedRequests = await Promise.all(
          requests.map(async (request) => {
            const detail = await lookupClient(request.client_id).catch(() => null);
            return { ...request, detail: mergeClientDetail(detail, request.detail || request) };
          })
        );
        const requestDetailsByClientId = Object.fromEntries(
          detailedRequests
            .filter((request) => request?.client_id)
            .map((request) => [request.client_id, request.detail || request.details || null])
        );

        setCoachProfile(profile);
        setStats(s);
        setClients((prev) =>
          hydrateClientRows(
            c,
            requestDetailsByClientId,
            prev
          )
        );
        setSessions(sess);
        setAvailability(avail);
        setReviews(rev);
        setWorkoutPlans(plans);
        setEarnings(earningsResponse);
        setClientRequests(detailedRequests);
        setClientRequestDetails(requestDetailsByClientId);
      } catch {
        setClientRequests([]);
      }
    })();
  }, [coachId]);

  const refreshRelationshipData = useCallback(async () => {
    if (!coachId) return;

    const [clientsResponse, statsResponse, requests] = await Promise.all([
      fetchMyClients(coachId).catch(() => []),
      fetchCoachStats(coachId).catch(() => null),
      fetchClientRequests().catch(() => []),
    ]);

    const detailedRequests = await Promise.all(
      requests.map(async (request) => {
        const detail = await lookupClient(request.client_id).catch(() => null);
        return { ...request, detail: mergeClientDetail(detail, request.detail || request) };
      })
    );

    setClients((prev) =>
      hydrateClientRows(
        clientsResponse,
        {
          ...clientRequestDetails,
          ...Object.fromEntries(
            detailedRequests
              .filter((request) => request?.client_id)
              .map((request) => [request.client_id, request.detail || request.details || null])
          ),
        },
        prev
      )
    );
    setStats(statsResponse);
    setClientRequests(detailedRequests);
    setClientRequestDetails((prev) => ({
      ...prev,
      ...Object.fromEntries(
        detailedRequests
          .filter((request) => request?.client_id)
          .map((request) => [request.client_id, request.detail || request.details || null])
      ),
    }));
  }, [coachId]);

  useEffect(() => {
    if (!coachId) return undefined;

    const refreshOnFocus = () => {
      void refreshRelationshipData();
    };

    window.addEventListener("focus", refreshOnFocus);
    const intervalId = window.setInterval(refreshRelationshipData, 15000);

    return () => {
      window.removeEventListener("focus", refreshOnFocus);
      window.clearInterval(intervalId);
    };
  }, [coachId, refreshRelationshipData]);

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
        const detail = await loadClientRequestDetails(request.client_id).catch(() => null);
        const mergedDetail = mergeClientDetail(detail, request.detail || request.details || request);
        await getConversationWithAccount(mergedDetail?.base_account?.id || null, {
          id: request.client_id,
          account_id: mergedDetail?.base_account?.id || null,
          name: resolveClientName(mergedDetail || request, request.client_id),
          role: "client",
        }).catch(() => null);
        const acceptedClient = {
          id: request.client_id,
          request_id: request.request_id,
          name: resolveClientName(mergedDetail || request, request.client_id),
          goal:
            mergedDetail?.fitness_goals?.[0]?.goal_enum ||
            request.goal ||
            "Active client",
          status: "active",
          joined: new Date().toLocaleDateString(),
          relationship_id: accepted.relationship_id,
          details: mergedDetail,
        };

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
      await refreshRelationshipData();
    } finally {
      setRequestActionId(null);
    }
  };

  const handleDenyRequest = async (requestId) => {
    setRequestActionId(requestId);
    try {
      await denyClientRequest(requestId);
      await refreshRelationshipData();
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

  const handleOpenClientChat = async (client) => {
    const clientId = client?.id ?? client;
    if (!clientId) return;

    setChatActionId(clientId);
    try {
      const detail = client?.details || await loadClientRequestDetails(clientId).catch(() => null);
      const accountId =
        detail?.base_account?.id ??
        client?.details?.base_account?.id ??
        null;

      const conversation = await getConversationWithAccount(accountId, {
        id: clientId,
        account_id: accountId,
        name: detail?.base_account?.name || client?.name || `Client #${clientId}`,
        role: "client",
      });

      closeOverlay();
      navigate(
        conversation?.partner_account_id
          ? `/coach/messages?account=${conversation.partner_account_id}`
          : `/coach/messages?client=${clientId}`
      );
    } catch {
      navigate(`/coach/messages?client=${clientId}`);
    } finally {
      setChatActionId(null);
    }
  };

  const handleTerminateClientRelationship = async (client) => {
    const relationshipId = Number(client?.relationship_id);
    if (!Number.isFinite(relationshipId)) return;
    if (!window.confirm(`End your coaching relationship with ${client?.name || "this client"}?`)) {
      return;
    }

    setRelationshipActionId(relationshipId);
    try {
      await terminateRelationship(relationshipId);
      await refreshRelationshipData();
      setSelectedClient((prev) =>
        Number(prev?.id ?? prev?.client_id) === Number(client.id) ? null : prev
      );
      if (overlay === "client_profile") {
        closeOverlay();
      }
    } finally {
      setRelationshipActionId(null);
    }
  };

  /*  derived  */
  const initials = account?.name
    ? account.name.split(" ").map((n) => n[0]).join("").toUpperCase()
    : "?";
  const nameParts = (account?.name ?? "").split(" ");
  const firstName = nameParts[0] || "—";
  const lastName = nameParts.slice(1).join(" ") || "";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";
  const availabilitySummary = summarizeAvailability(availability);

  /*  loading skeleton  */
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
      <Navbar
        role={role}
        userName={initials}
        switchOptions={[
          { label: "Client", to: "/client" },
          ...(canSwitchToAdmin ? [{ label: "Admin", to: "/admin" }] : []),
        ]}
      />

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">

        {/*  OVERVIEW  */}
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
            label="AVG RATING"
            value={stats?.avg_rating ? `★ ${stats.avg_rating}` : "—"}
            sub={stats?.review_count ? `${stats.review_count} reviews` : "no reviews"}
          />
          <StatCard
            role={role}
            label="EARNINGS"
            value={`$${formatCoachEarnings(earnings)}`}
            sub="documented earnings route"
          />
        </div>

        {/*  CLIENTS & SESSIONS  */}
        <SectionHeader label="CLIENTS & SESSIONS" role={role} />

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-stretch">
          {/* My Clients */}
          {(() => {
            const activeClients = clients.filter((c) => c.status === "active");
            return (
              <DashboardCard
                role={role}
                title={`My Clients (${activeClients.length})`}
                action={{ label: "View all", onClick: () => setOverlay("clients") }}
              >
                <div className="space-y-2">
                  {activeClients.slice(0, 4).map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors"
                    >
                      <div
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => { setSelectedClient(c); setOverlay("client_profile"); }}
                      >
                        <div className="flex items-center gap-3">
                          <ProfileAvatar
                            src={c.details?.base_account?.pfp_url}
                            alt={c.name}
                            name={c.name}
                            size="md"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-medium text-sm truncate">{c.name}</p>
                            <p className="text-gray-400 text-xs">
                              {c.goal} · {c.details?.base_account?.age || "—"} · {c.details?.base_account?.gender || "—"}
                            </p>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleOpenClientChat(c)}
                        disabled={chatActionId === c.id}
                        className="shrink-0 rounded-lg text-orange-400 hover:text-orange-300 transition-colors p-1.5 hover:bg-orange-500/10 disabled:opacity-50"
                        title="Message client"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                        </svg>
                      </button>
                      {c.relationship_id ? (
                        <button
                          onClick={() => handleTerminateClientRelationship(c)}
                          disabled={relationshipActionId === c.relationship_id}
                          className="shrink-0 rounded-lg text-red-300 hover:text-red-200 transition-colors p-1.5 hover:bg-red-500/10 disabled:opacity-50"
                          title="End relationship"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                            <path d="M18 6L6 18M6 6l12 12" />
                          </svg>
                        </button>
                      ) : null}
                    </div>
                  ))}
                  {activeClients.length > 4 && (
                    <p className="text-gray-500 text-xs text-center pt-1">+{activeClients.length - 4} more</p>
                  )}
                  {activeClients.length === 0 && (
                    <p className="text-gray-500 text-xs text-center py-4">No active clients yet</p>
                  )}
                </div>
              </DashboardCard>
            );
          })()}

          

          {/* Availability */}
          <DashboardCard
            role={role}
            title="My Availability"
            action={{ label: "Edit", onClick: () => setOverlay("availability") }}
          >
            {availabilityMessage ? (
              <div className="mb-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
                {availabilityMessage}
              </div>
            ) : null}
            {availabilityError ? (
              <div className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                {availabilityError}
              </div>
            ) : null}
            <div className="mb-3 grid grid-cols-3 gap-2">
              <div className="rounded-lg bg-[#0A1020] px-3 py-2 text-center">
                <p className="text-lg font-bold text-orange-300">{availabilitySummary.openSlots}</p>
                <p className="text-[10px] uppercase tracking-widest text-gray-500">Open Slots</p>
              </div>
              <div className="rounded-lg bg-[#0A1020] px-3 py-2 text-center">
                <p className="text-lg font-bold text-white">{availabilitySummary.activeDays}</p>
                <p className="text-[10px] uppercase tracking-widest text-gray-500">Active Days</p>
              </div>
              <div className="rounded-lg bg-[#0A1020] px-3 py-2 text-center">
                <p className="text-lg font-bold text-blue-300">{availabilitySummary.bookedSlots}</p>
                <p className="text-[10px] uppercase tracking-widest text-gray-500">Booked</p>
              </div>
            </div>
            <p className="mb-3 text-xs text-gray-500">
              Saved as one-hour windows through your coach information route.
            </p>
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
                  <div
                    key={request.request_id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                    onClick={() => {
                      setSelectedClient({
                        id: request.client_id,
                        name: request.name || `Client #${request.client_id}`,
                        details: request.detail || clientRequestDetails[request.client_id] || {
                          base_account: {
                            name: request.name,
                            age: request.age,
                            gender: request.gender,
                            pfp_url: request.pfp_url,
                          },
                        },
                      });
                      setOverlay("client_profile");
                    }}
                  >
                    <ProfileAvatar
                      src={request.pfp_url}
                      alt={request.name}
                      name={request.name}
                      size="md"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium text-sm truncate">{request.name}</p>
                      <p className="text-gray-400 text-xs">
                        {request.goal} · {request.age || "—"} · {request.gender || "—"}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </DashboardCard>
        </div>

        {/*  PLANS & REVIEWS  */}
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
          clients={clients.filter((c) => c.status === "active")}
          onMessage={handleOpenClientChat}
          onViewProfile={(c) => { setSelectedClient(c); setOverlay("client_profile"); }}
          onTerminateRelationship={handleTerminateClientRelationship}
          terminatingRelationshipId={relationshipActionId}
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
            setAvailabilityMessage("");
            try {
              const refreshedAvailability = await saveCoachAvailability(coachId, updatedSlots);
              setAvailability(refreshedAvailability);
              setAvailabilityMessage("Availability saved to your coach profile.");
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

      <Overlay
        open={overlay === "client_profile"}
        onClose={() => { closeOverlay(); setSelectedClient(null); }}
        title={selectedClient?.name || "Client Profile"}
        wide
      >
        {selectedClient ? (
          <ClientProfile
            clientId={selectedClient.id ?? selectedClient.client_id}
            detail={selectedClient.details || selectedClient.detail}
            onTerminateRelationship={handleTerminateClientRelationship}
            terminatingRelationshipId={relationshipActionId}
          />
        ) : null}
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
                    <div className="flex items-start gap-4 flex-1">
                      <ProfileAvatar
                        src={request.pfp_url}
                        alt={request.name}
                        name={request.name}
                        size="lg"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-semibold">
                          {request.name || `Client #${request.client_id}`}
                        </p>
                        <p className="text-xs text-gray-500">
                          Goal: {request.goal} · Age: {request.age || "—"} · Gender: {request.gender || "—"}
                        </p>
                        <button
                          onClick={() => {
                            setSelectedClient({
                              id: request.client_id,
                              name: request.name || `Client #${request.client_id}`,
                              details: request.detail || clientRequestDetails[request.client_id] || {
                                base_account: {
                                  name: request.name,
                                  age: request.age,
                                  gender: request.gender,
                                  pfp_url: request.pfp_url,
                                },
                              },
                            });
                            setOverlay("client_profile");
                          }}
                          className="mt-1.5 text-xs text-orange-400/70 hover:text-orange-300 transition-colors"
                        >
                          View Profile →
                        </button>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAcceptRequest(request)}
                        disabled={requestActionId === request.request_id}
                        className="rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-xs font-semibold text-green-300 disabled:opacity-60 whitespace-nowrap"
                      >
                        {requestActionId === request.request_id ? "Accepting..." : "Accept"}
                      </button>
                      <button
                        onClick={() => handleDenyRequest(request.request_id)}
                        disabled={requestActionId === request.request_id}
                        className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300 disabled:opacity-60 whitespace-nowrap"
                      >
                        {requestActionId === request.request_id ? "Declining..." : "Decline"}
                      </button>
                    </div>
                  </div>

                  {detail ? (
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="rounded-xl bg-[#101827] p-3">
                        <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-2">Additional Info</p>
                        <div className="space-y-1 text-xs text-gray-300">
                          <p>Email: {detail.base_account?.email || "—"}</p>
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
