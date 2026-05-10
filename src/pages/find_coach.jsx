import { useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { Navbar, StatusBadge, SkeletonDashCard } from "../components";
import {
  fetchMe,
  fetchAvailableCoaches,
  fetchMyCoachRequests,
  fetchMyCoach,
  requestCoach,
  deleteCoachRequest,
} from "../api/client";
import { getCoachAccessState } from "../utils/roleAccess";
import { resolveRoleState } from "../utils/sessionAuth";
import { forgetTerminatedCoachId } from "../utils/terminatedRelationships";

const role = "client";

function SolidStar({ className }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.367 2.446a1 1 0 00-.364 1.118l1.286 3.957c.3.921-.755 1.688-1.54 1.118l-3.366-2.446a1 1 0 00-1.176 0l-3.366 2.446c-.784.57-1.838-.197-1.539-1.118l1.286-3.957a1 1 0 00-.364-1.118L2.05 9.385c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.957z" />
    </svg>
  );
}

const INTERVAL_ABBREV = {
  monthly: "/mo",
  yearly: "/yr",
  annually: "/yr",
  weekly: "/wk",
  daily: "/day",
};

function formatRateTag(coach) {
  const amount = String(coach?.amount || "").trim();
  const interval = String(coach?.pricingInterval || "").trim().toLowerCase();
  if (!amount && !interval) return null;
  const parsed = Number(amount);
  const amountLabel = Number.isFinite(parsed) && amount !== "" ? `$${parsed % 1 === 0 ? parsed : parsed.toFixed(2)}` : amount;
  const abbrev = INTERVAL_ABBREV[interval] || (interval ? `/${interval}` : "");
  return `${amountLabel}${abbrev}`;
}

function extractSpecialties(coaches) {
  const set = new Set();
  coaches.forEach((coach) => {
    (coach.specialties || []).forEach((specialty) => set.add(specialty));
  });
  return Array.from(set).sort();
}


function Stars({ rating }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.25;
  const stars = [];

  {/* full star */}
  for (let i = 0; i < full; i++)
    stars.push(<SolidStar className="w-[1em] h-[1em]" />);

  {/* half star */}
  if (half) {
    stars.push(
    <span key="half" className="relative w-[1em] h-[1em]">
      {/* grey background*/}
      <SolidStar className="absolute w-[1em] h-[1em] text-gray-600" />

      {/* yellow half star */}
      <span className="absolute overflow-hidden w-1/2 text-yellow-400">
        <SolidStar className="w-[1em] h-[1em]" />
      </span>
    </span>
    );
  }

  {/* empty star */}
  for (let i = stars.length; i < 5; i++)
    stars.push(<SolidStar className="w-[1em] h-[1em] text-gray-600" />);

  {/* render stars array */}
  return (
    <> {stars} </>
  );
}

export default function FindCoachPage() {
  const navigate = useNavigate();

  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);

  const [coaches, setCoaches] = useState([]);
  const [loadingCoaches, setLoadingCoaches] = useState(true);

  const [search, setSearch] = useState("");
  const [selectedSpecialty, setSelectedSpecialty] = useState(null);
  const [selectedGender, setSelectedGender] = useState("all");
  const [sortBy, setSortBy] = useState("avg_rating");

  const [requesting, setRequesting] = useState(null);
  const [requestError, setRequestError] = useState("");
  const [canSwitchToCoach, setCanSwitchToCoach] = useState(false);
  const [hasClientRole, setHasClientRole] = useState(false);
  const [activePendingRequest, setActivePendingRequest] = useState(null);
  const [hasActiveCoach, setHasActiveCoach] = useState(false);

  useEffect(() => {
    fetchMe()
      .then(async (me) => {
        setAccount(me);
        const roleState = await resolveRoleState();
        setHasClientRole(roleState.hasClientRole);
        const coachAccess = await getCoachAccessState(me);
        setCanSwitchToCoach(coachAccess.canAccessCoach);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [navigate]);

  useEffect(() => {
    if (!account?.id) return;

    Promise.all([
      fetchMyCoachRequests(),
      fetchMyCoach().catch(() => null),
    ])
      .then(([requests, myCoach]) => {
        setHasActiveCoach(myCoach?.relationship_id != null);
        const pending = (Array.isArray(requests) ? requests : []).find(
          (r) => r.status === "pending"
        ) || null;
        setActivePendingRequest(pending);
      })
      .catch(() => {
        setActivePendingRequest(null);
        setHasActiveCoach(false);
      });
  }, [account?.id]);

  useEffect(() => {
    let cancelled = false;
    setLoadingCoaches(true);

    const timeoutId = setTimeout(() => {
      fetchAvailableCoaches({
        name: search.trim() || null,
        specialty: selectedSpecialty,
        gender: selectedGender === "all" ? null : selectedGender,
        sort_by: sortBy,
        order: "desc",
      })
        .then((result) => {
          if (!cancelled) {
            setCoaches(result);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setCoaches([]);
          }
        })
        .finally(() => {
          if (!cancelled) {
            setLoadingCoaches(false);
          }
        });
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [search, selectedSpecialty, selectedGender, sortBy]);

  const allSpecialties = useMemo(() => extractSpecialties(coaches), [coaches]);

  const refreshRequestState = async () => {
    const [requests, myCoach] = await Promise.all([
      fetchMyCoachRequests(),
      fetchMyCoach().catch(() => null),
    ]);
    setHasActiveCoach(myCoach?.relationship_id != null);
    const pending = (Array.isArray(requests) ? requests : []).find(
      (r) => r.status === "pending"
    ) || null;
    setActivePendingRequest(pending);
  };

  const handleRequest = async (coachId) => {
    if (!hasClientRole) {
      setRequestError("You need to finish client onboarding before requesting a coach.");
      return;
    }
    setRequestError("");
    setRequesting(coachId);
    try {
      await requestCoach(account.client_id, coachId);
      forgetTerminatedCoachId(coachId);
      await refreshRequestState();
    } catch (error) {
      setRequestError(error.message || "Unable to send coach request.");
    } finally {
      setRequesting(null);
    }
  };

  const handleCancelRequest = async () => {
    if (!activePendingRequest?.request_id) return;
    setRequestError("");
    setRequesting(activePendingRequest.coach_id);
    try {
      await deleteCoachRequest(activePendingRequest.request_id);
      await refreshRequestState();
    } catch (error) {
      setRequestError(error.message || "Unable to cancel coach request.");
    } finally {
      setRequesting(null);
    }
  };

  const isLocked = hasActiveCoach || activePendingRequest !== null;

  const userInitials = account?.name
    ? account.name.split(" ").map((name) => name[0]).join("").toUpperCase()
    : "?";

  if (loading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: "#080D19" }}>
        <Navbar role={role} userName="?" canSwitchToCoach={canSwitchToCoach} />
        <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
          <div className="h-5 w-48 bg-white/5 rounded animate-pulse" />
          <div className="h-12 bg-white/5 rounded-xl animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SkeletonDashCard rows={4} />
            <SkeletonDashCard rows={4} />
            <SkeletonDashCard rows={4} />
            <SkeletonDashCard rows={4} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#080D19" }}>
      <Navbar role={role} userName={userInitials} canSwitchToCoach={canSwitchToCoach} />

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Find a Coach</h1>
            <p className="text-gray-500 text-sm mt-1">
              Browse verified coaches using the real backend filters and reviews.
            </p>
          </div>
          <button
            onClick={() => navigate("/client")}
            className="text-sm text-blue-400 border border-blue-500/30 rounded-lg px-4 py-2 hover:bg-blue-500/10 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>

        <div className="relative">
          <svg
            className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by coach name"
            className="w-full rounded-xl border border-white/10 bg-[#0B1220] pl-12 pr-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-blue-400/40 focus:ring-2 focus:ring-blue-500/10"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setSelectedSpecialty(null)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              !selectedSpecialty
                ? "bg-blue-600 text-white border-blue-600"
                : "border-white/10 text-gray-400 hover:border-white/20"
            }`}
          >
            All
          </button>

          {allSpecialties.map((specialty) => (
            <button
              key={specialty}
              onClick={() =>
                setSelectedSpecialty((prev) => (prev === specialty ? null : specialty))
              }
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                selectedSpecialty === specialty
                  ? "bg-blue-600 text-white border-blue-600"
                  : "border-white/10 text-gray-400 hover:border-white/20"
              }`}
            >
              {specialty}
            </button>
          ))}

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <span className="text-[10px] text-gray-500 uppercase tracking-wider">Gender</span>
            <select
              value={selectedGender}
              onChange={(e) => setSelectedGender(e.target.value)}
              className="rounded-lg border border-white/10 bg-[#0B1220] px-3 py-1.5 text-xs text-gray-300 outline-none focus:border-blue-400/40"
            >
              <option value="all">All</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="non-binary">Non-binary</option>
            </select>

            <span className="text-[10px] text-gray-500 uppercase tracking-wider">Sort by</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="rounded-lg border border-white/10 bg-[#0B1220] px-3 py-1.5 text-xs text-gray-300 outline-none focus:border-blue-400/40"
            >
              <option value="avg_rating">Highest Rated</option>
              <option value="rating_count">Most Reviewed</option>
            </select>
          </div>
        </div>

        <p className="text-gray-500 text-xs">
          {coaches.length} coach{coaches.length !== 1 ? "es" : ""} found
        </p>

        {requestError && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {requestError}
          </div>
        )}

        {isLocked && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200 flex items-center justify-between gap-4">
            <span>
              {hasActiveCoach
                ? "You already have an active coach. Manage your relationship from the dashboard."
                : `You have a pending request to ${activePendingRequest?.coach_name || "a coach"}. You cannot send new requests until it's resolved.`}
            </span>
            {activePendingRequest && (
              <button
                onClick={() => navigate(`/coaches/${activePendingRequest.coach_id}?from=dashboard`)}
                className="shrink-0 rounded-lg border border-amber-400/40 px-3 py-1 text-xs font-medium text-amber-300 hover:bg-amber-500/10"
              >
                View Request
              </button>
            )}
          </div>
        )}

        {loadingCoaches ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SkeletonDashCard rows={4} />
            <SkeletonDashCard rows={4} />
            <SkeletonDashCard rows={4} />
            <SkeletonDashCard rows={4} />
          </div>
        ) : coaches.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500 text-sm">No coaches match your backend filters.</p>
            <button
              onClick={() => {
                setSearch("");
                setSelectedSpecialty(null);
                setSelectedGender("all");
                setSortBy("avg_rating");
              }}
              className="text-blue-400 text-sm mt-2 hover:underline"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {coaches.map((coach) => {
              const isThisPending = activePendingRequest?.coach_id === coach.coach_id;
              const isRequesting = requesting === coach.coach_id;
              const initials = coach.name?.split(" ").map((name) => name[0]).join("") ?? "?";

              const rateTag = formatRateTag(coach);

              return (
                <div
                  key={coach.coach_id}
                  className="relative rounded-2xl border border-white/6 bg-[#0F1729] p-5 hover:border-blue-500/20 transition-colors"
                >
                  {rateTag && (
                    <span className="absolute top-4 right-4 rounded-full bg-emerald-500/15 border border-emerald-500/25 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400 leading-tight">
                      {rateTag}
                    </span>
                  )}
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-full bg-blue-900/40 flex items-center justify-center text-blue-400 font-bold text-lg shrink-0">
                      {initials}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-white font-bold text-sm truncate">{coach.name}</p>
                        {coach.verified && <StatusBadge label="Verified" variant="success" dot />}
                      </div>

                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {(coach.specialties || []).map((specialty) => (
                          <span
                            key={specialty}
                            className="bg-blue-500/10 text-blue-400 text-[10px] font-medium px-2 py-0.5 rounded-full"
                          >
                            {specialty}
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center gap-2 mt-2">
                        <span className="inline-flex items-center text-yellow-400 text-sm leading-none tracking-normal">
                          <Stars rating={coach.rating_avg ?? 0} />
                          <span className="text-gray-600 ml-2">
                            {coach.rating_avg?.toFixed(1)} · {coach.review_count} review{coach.review_count !== 1 ? "s" : ""}
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4 mt-4 pt-3 border-t border-white/5">
                    <div className="flex-1 text-center">
                      <p className="text-white font-bold text-sm">{coach.age ?? "—"}</p>
                      <p className="text-gray-500 text-[10px] uppercase tracking-wider">Age</p>
                    </div>
                    <div className="flex-1 text-center">
                      <p className="text-white font-bold text-sm">{coach.gender ?? "—"}</p>
                      <p className="text-gray-500 text-[10px] uppercase tracking-wider">Gender</p>
                    </div>
                    <div className="flex-1 text-center">
                      <p className="text-white font-bold text-sm">{coach.certifications?.length ?? 0}</p>
                      <p className="text-gray-500 text-[10px] uppercase tracking-wider">Certs</p>
                    </div>
                    <div className="flex-1 text-center">
                      <p className="text-white font-bold text-sm">{coach.review_count ?? 0}</p>
                      <p className="text-gray-500 text-[10px] uppercase tracking-wider">Reviews</p>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => navigate(`/coaches/${coach.coach_id}`)}
                      className="flex-1 border border-white/10 text-gray-300 hover:bg-white/5 rounded-xl py-2.5 text-sm font-medium transition-colors"
                    >
                      View Profile
                    </button>
                    {coach.account_id ? (
                      <button
                        onClick={() => navigate(`/client/messages?account=${coach.account_id}`)}
                        className="flex-1 border border-white/10 text-gray-300 hover:bg-white/5 rounded-xl py-2.5 text-sm font-medium transition-colors"
                      >
                        Message
                      </button>
                    ) : null}
                    {isThisPending ? (
                      <button
                        onClick={handleCancelRequest}
                        disabled={isRequesting}
                        className="flex-1 bg-amber-900/30 text-amber-400 border border-amber-500/30 rounded-xl py-2.5 text-sm font-medium disabled:opacity-70"
                      >
                        {isRequesting ? "Cancelling..." : "Cancel Request"}
                      </button>
                    ) : !isLocked ? (
                      <button
                        onClick={() => handleRequest(coach.coach_id)}
                        disabled={isRequesting}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-900/40 text-white rounded-xl py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed"
                      >
                        {isRequesting ? "Sending..." : "Request Coach"}
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
