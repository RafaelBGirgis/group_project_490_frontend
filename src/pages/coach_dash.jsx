import { Navigate, useNavigate } from "react-router-dom";
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
  fetchCoachReviews,
  fetchCoachWorkoutPlans,
  fetchClientRequests,
  lookupClient,
  acceptClientRequest,
  denyClientRequest,
} from "../api/coach";
import { getConversationWithAccount } from "../api/chat";
import { getCoachAccessState, getImmediateCoachAccessState } from "../utils/roleAccess";
import { getImmediateRoleState, resolveRoleState } from "../utils/sessionAuth";
import { setLastRoleContext } from "../utils/sessionCache";
import SessionsDetail from "../components/overlays/sessions_detail";
import ReviewsDetail from "../components/overlays/reviews_detail";
import ClientProfile from "../components/overlays/client_profile";
import CoachMealsOverlay from "../components/overlays/coach_meals";

const role = "coach";

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

export default function CoachDashboard() {
  const navigate = useNavigate();
  const immediateRoleState = getImmediateRoleState();
  const immediateCoachAccess = getImmediateCoachAccessState();

  /*  auth guard  */
  const [authed, setAuthed] = useState(false);
  useEffect(() => {
    setAuthed(true);
  }, [navigate]);

  useEffect(() => {
    setLastRoleContext({ role: "coach", dashboardPath: "/coach" });
  }, []);

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
  const [reviews, setReviews] = useState([]);
  const [workoutPlans, setWorkoutPlans] = useState([]);
  const [clientRequests, setClientRequests] = useState([]);
  const [clientRequestDetails, setClientRequestDetails] = useState({});
  const [requestActionId, setRequestActionId] = useState(null);
  const [canSwitchToAdmin, setCanSwitchToAdmin] = useState(immediateRoleState.hasAdminRole);
  const [chatActionId, setChatActionId] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [clientSearchTerm, setClientSearchTerm] = useState("");

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
        const [profile, s, c, sess, rev, plans, earningsResponse] = await Promise.all([
          fetchCoachProfile().catch(() => null),
          fetchCoachStats(coachId).catch(() => null),
          fetchMyClients(coachId).catch(() => []),
          fetchUpcomingSessions(coachId).catch(() => []),
          fetchCoachReviews(coachId).catch(() => []),
          fetchCoachWorkoutPlans(coachId).catch(() => []),
          fetchCoachEarnings().catch(() => null),
        ]);
        const requests = await fetchClientRequests().catch(() => []);
        const detailedRequests = await Promise.all(
          requests.map(async (request) => {
            const detail = await lookupClient(request.client_id).catch(() => null);
            const mergedDetail = mergeClientDetail(detail, request.detail || request);
            return {
              ...request,
              detail: mergedDetail,
              name: resolveClientName(mergedDetail, request.client_id),
              age: mergedDetail?.base_account?.age ?? request.age,
              gender: mergedDetail?.base_account?.gender || request.gender,
              pfp_url: mergedDetail?.base_account?.pfp_url || request.pfp_url,
              goal: mergedDetail?.fitness_goals?.[0]?.goal_enum || request.goal || "Pending request"
            };
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
        const mergedDetail = mergeClientDetail(detail, request.detail || request);
        return {
          ...request,
          detail: mergedDetail,
          name: resolveClientName(mergedDetail, request.client_id),
          age: mergedDetail?.base_account?.age ?? request.age,
          gender: mergedDetail?.base_account?.gender || request.gender,
          pfp_url: mergedDetail?.base_account?.pfp_url || request.pfp_url,
          goal: mergedDetail?.fitness_goals?.[0]?.goal_enum || request.goal || "Pending request"
        };
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

  /*  derived  */
  const initials = account?.name
    ? account.name.split(" ").map((n) => n[0]).join("").toUpperCase()
    : "?";
  const nameParts = (account?.name ?? "").split(" ");
  const firstName = nameParts[0] || "—";
  const lastName = nameParts.slice(1).join(" ") || "";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";
  const shouldBlockCoachPage =
    immediateRoleState.roleNames.length > 0 &&
    !immediateRoleState.hasAdminRole &&
    !immediateCoachAccess.canAccessCoach;

  if (shouldBlockCoachPage) {
    return <Navigate to="/profile" replace />;
  }

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
            sub="from paid invoices"
          />
        </div>

        {/*  CLIENTS & SESSIONS  */}
        <SectionHeader label="CLIENTS & SESSIONS" role={role} />

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-stretch">
          {/* My Clients */}
          {(() => {
            const activeClients = clients.filter((c) => c.status === "active");
            return (
              <DashboardCard
                role={role}
              >
                <div className="flex items-center justify-between w-full">
                  <h3 className="text-white font-semibold text-base group-hover:translate-x-1 transition-transform duration-300">
                    My Clients ({activeClients.length})
                  </h3>
                  <div className="w-48">
                    <input
                      type="text"
                      placeholder="Search by name..."
                      value={clientSearchTerm}
                      onChange={(e) => setClientSearchTerm(e.target.value)}
                      className="w-full rounded-lg border border-white/10 bg-[#0A1020] px-3 py-1.5 text-xs text-white outline-none placeholder:text-gray-600 focus:border-orange-500/50"
                    />
                  </div>
                </div>
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {activeClients
                    .filter(c => c.name?.toLowerCase().includes(clientSearchTerm.toLowerCase()))
                    .map((c) => (
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
                    </div>
                  ))}
                  {activeClients.length === 0 && (
                    <p className="text-gray-500 text-xs text-center py-4">No active clients yet</p>
                  )}
                </div>
              </DashboardCard>
            );
          })()}

          <DashboardCard
            role={role}
            title={`Client Requests (${clientRequests.length})`}
          >
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {clientRequests.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-6">No pending requests</p>
              ) : (
                clientRequests.map((request) => (
                  <div
                    key={request.request_id}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer group"
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
                    <div className="flex items-center gap-3 flex-1 min-w-0">
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
                    <div className="flex items-center gap-1 transition-opacity">
                      {request?.detail?.base_account?.id ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/coach/messages?account=${request.detail.base_account.id}`);
                          }}
                          className="p-1.5 rounded-lg text-blue-400 hover:bg-blue-500/10 transition-colors"
                          title="Message"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                        </button>
                      ) : null}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleAcceptRequest(request); }}
                        disabled={requestActionId === request.request_id}
                        className="p-1.5 rounded-lg text-green-400 hover:bg-green-500/10 disabled:opacity-50 transition-colors"
                        title="Accept"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDenyRequest(request.request_id); }}
                        disabled={requestActionId === request.request_id}
                        className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 disabled:opacity-50 transition-colors"
                        title="Decline"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </DashboardCard>
        </div>

        {/*  PLANS & REVIEWS  */}
        <SectionHeader label="PLANS & REVIEWS" role={role} />

        <div className="grid grid-cols-3 gap-4">
          {/* Meals — coach builds meals from USDA foods and prescribes to clients.
              Backed by /api/foods (USDA proxy) and /api/meals (CRUD + prescribe).
              The full builder UI lives in the overlay; this card is just an
              entry point with a quick count of saved meals. */}
          <DashboardCard
            role={role}
            title="Meals"
            footer={
              <button
                onClick={() => setOverlay("coach_meals")}
                className="w-full py-2 rounded-xl border border-orange-500/30 text-orange-400 text-xs font-semibold hover:bg-orange-500/10 transition-colors"
              >
                Manage Meals
              </button>
            }
          >
            <p className="text-gray-400 text-xs">
              Build meals from the USDA food database and assign them to your
              clients. Calories and macros are computed automatically from
              ingredient grams.
            </p>
          </DashboardCard>

          {/* Workout Plans */}
          <DashboardCard
            role={role}
            title="Workout Plans"
            footer={
              <button
                onClick={() => navigate("/plan-my-week?role=coach")}
                className="w-full py-2 rounded-xl border border-orange-500/30 text-orange-400 text-xs font-semibold hover:bg-orange-500/10 transition-colors"
              >
                Prescribe Plans
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

      <Overlay open={overlay === "sessions"} onClose={closeOverlay} title="Upcoming Sessions" wide>
        <SessionsDetail sessions={sessions} />
      </Overlay>

      <Overlay open={overlay === "reviews"} onClose={closeOverlay} title="Client Reviews">
        <ReviewsDetail
          reviews={reviews}
          avgRating={stats?.avg_rating}
          totalCount={stats?.review_count}
        />
      </Overlay>

      <Overlay
        open={overlay === "coach_meals"}
        onClose={closeOverlay}
        title="Meals"
        wide
      >
        <CoachMealsOverlay
          clients={clients
            .filter((c) => c.status === "active")
            .map((c) => ({ id: c.id, name: c.name }))}
          onClose={closeOverlay}
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
          />
        ) : null}
      </Overlay>

    </div>
  );
}
