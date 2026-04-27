import { useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { Navbar, StatusBadge, SkeletonDashCard } from "../components";
import {
  fetchMe,
  fetchAvailableCoaches,
  requestCoach,
  deleteCoachRequest,
  fetchCoachReviews,
  createCoachReview,
  fetchCoachReports,
  createCoachReport,
} from "../api/client";

const role = "client";

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

  return (
    <span className="text-yellow-400 text-sm tracking-wide">
      {"★".repeat(full)}
      {half && "½"}
      <span className="text-gray-600">{"★".repeat(5 - full - (half ? 1 : 0))}</span>
    </span>
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
  const [requestedIds, setRequestedIds] = useState(new Set());
  const [pendingRequests, setPendingRequests] = useState({});

  const [expandedId, setExpandedId] = useState(null);
  const [coachReviews, setCoachReviews] = useState({});
  const [coachReports, setCoachReports] = useState({});
  const [loadingDetailsId, setLoadingDetailsId] = useState(null);
  const [reviewDrafts, setReviewDrafts] = useState({});
  const [reportDrafts, setReportDrafts] = useState({});
  const [submittingReviewId, setSubmittingReviewId] = useState(null);
  const [submittingReportId, setSubmittingReportId] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("jwt");
    if (!token) {
      navigate("/login");
      return;
    }

    fetchMe()
      .then((me) => setAccount(me))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [navigate]);

  useEffect(() => {
    if (!account?.email) return;
    const storageKey = `pending_coach_requests:${String(account.email).trim().toLowerCase()}`;
    const raw = localStorage.getItem(storageKey);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      setPendingRequests(parsed || {});
      setRequestedIds(new Set(Object.keys(parsed || {}).map((key) => Number(key))));
    } catch {
      setPendingRequests({});
    }
  }, [account?.email]);

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

  const loadCoachDetails = async (coachId) => {
    setLoadingDetailsId(coachId);
    try {
      const [reviewsResponse, reportsResponse] = await Promise.all([
        fetchCoachReviews(coachId).catch(() => ({ reviews: [] })),
        fetchCoachReports(coachId).catch(() => ({ reports: [] })),
      ]);

      setCoachReviews((prev) => ({
        ...prev,
        [coachId]: Array.isArray(reviewsResponse?.reviews) ? reviewsResponse.reviews : [],
      }));
      setCoachReports((prev) => ({
        ...prev,
        [coachId]: Array.isArray(reportsResponse?.reports) ? reportsResponse.reports : [],
      }));
    } finally {
      setLoadingDetailsId(null);
    }
  };

  const toggleExpanded = async (coachId) => {
    if (expandedId === coachId) {
      setExpandedId(null);
      return;
    }

    setExpandedId(coachId);
    if (!coachReviews[coachId] || !coachReports[coachId]) {
      await loadCoachDetails(coachId);
    }
  };

  const handleRequest = async (coachId) => {
    if (!account?.client_id) return;
    setRequesting(coachId);
    try {
      const response = await requestCoach(account.client_id, coachId);
      setRequestedIds((prev) => new Set(prev).add(coachId));
      if (account?.email && response?.request_id) {
        const nextPending = {
          ...pendingRequests,
          [coachId]: response.request_id,
        };
        const storageKey = `pending_coach_requests:${String(account.email).trim().toLowerCase()}`;
        localStorage.setItem(storageKey, JSON.stringify(nextPending));
        setPendingRequests(nextPending);
      }
    } catch {
      // Keep the user on the page.
    } finally {
      setRequesting(null);
    }
  };

  const handleCancelRequest = async (coachId) => {
    const requestId = pendingRequests[coachId];
    if (!requestId) return;
    setRequesting(coachId);
    try {
      await deleteCoachRequest(requestId);
      const nextPending = { ...pendingRequests };
      delete nextPending[coachId];
      setPendingRequests(nextPending);
      setRequestedIds((prev) => {
        const next = new Set(prev);
        next.delete(coachId);
        return next;
      });
      if (account?.email) {
        const storageKey = `pending_coach_requests:${String(account.email).trim().toLowerCase()}`;
        localStorage.setItem(storageKey, JSON.stringify(nextPending));
      }
    } finally {
      setRequesting(null);
    }
  };

  const handleReviewSubmit = async (coachId) => {
    const draft = reviewDrafts[coachId] || { rating: 5, review_text: "" };
    if (!draft.review_text?.trim()) return;

    setSubmittingReviewId(coachId);
    try {
      await createCoachReview(coachId, draft.rating, draft.review_text.trim());
      await loadCoachDetails(coachId);
      setReviewDrafts((prev) => ({
        ...prev,
        [coachId]: { rating: 5, review_text: "" },
      }));
    } finally {
      setSubmittingReviewId(null);
    }
  };

  const handleReportSubmit = async (coachId) => {
    const draft = reportDrafts[coachId] || "";
    if (!draft.trim()) return;

    setSubmittingReportId(coachId);
    try {
      await createCoachReport(coachId, draft.trim());
      await loadCoachDetails(coachId);
      setReportDrafts((prev) => ({ ...prev, [coachId]: "" }));
    } finally {
      setSubmittingReportId(null);
    }
  };

  const userInitials = account?.name
    ? account.name.split(" ").map((name) => name[0]).join("").toUpperCase()
    : "?";

  if (loading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: "#080D19" }}>
        <Navbar role={role} userName="?" />
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
      <Navbar role={role} userName={userInitials} />

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
              const isExpanded = expandedId === coach.coach_id;
              const isRequested = requestedIds.has(coach.coach_id);
              const isRequesting = requesting === coach.coach_id;
              const initials = coach.name?.split(" ").map((name) => name[0]).join("") ?? "?";
              const reviews = coachReviews[coach.coach_id] || [];
              const reports = coachReports[coach.coach_id] || [];

              return (
                <div
                  key={coach.coach_id}
                  className="rounded-2xl border border-white/6 bg-[#0F1729] p-5 hover:border-blue-500/20 transition-colors"
                >
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
                        <Stars rating={coach.rating_avg ?? 0} />
                        <span className="text-gray-500 text-xs">
                          {(coach.rating_avg ?? 0).toFixed(1)} · {coach.review_count} review
                          {coach.review_count !== 1 ? "s" : ""}
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

                  {isExpanded && (
                    <div className="mt-4 pt-3 border-t border-white/5 space-y-3">
                      {coach.bio ? (
                        <div>
                          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">About</p>
                          <p className="text-gray-300 text-xs leading-relaxed">{coach.bio}</p>
                        </div>
                      ) : null}

                      {coach.certifications?.length > 0 ? (
                        <div>
                          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Certifications</p>
                          <div className="space-y-1">
                            {coach.certifications.map((certification, index) => (
                              <div key={`${certification.name}-${index}`} className="flex items-center gap-2">
                                <span className="text-blue-400 text-xs">✓</span>
                                <span className="text-gray-300 text-xs">{certification.name}</span>
                                <span className="text-gray-600 text-[10px]">— {certification.organization}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      <div>
                        <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Recent Reviews</p>
                        {loadingDetailsId === coach.coach_id ? (
                          <p className="text-gray-500 text-xs">Loading reviews...</p>
                        ) : reviews.length === 0 ? (
                          <p className="text-gray-500 text-xs">No reviews yet.</p>
                        ) : (
                          <div className="space-y-2">
                            {reviews.slice(0, 3).map((review) => (
                              <div key={review.id} className="rounded-xl bg-[#0B1220] px-3 py-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-yellow-400 text-[11px]">
                                    {"★".repeat(Math.max(0, Math.round(Number(review.rating || 0))))}
                                  </span>
                                  <span className="text-[10px] text-gray-600">
                                    {review.last_updated
                                      ? new Date(review.last_updated).toLocaleDateString()
                                      : ""}
                                  </span>
                                </div>
                                <p className="mt-1 text-xs text-gray-300">{review.review_text}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="rounded-xl bg-[#0B1220] p-3">
                          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Leave Review</p>
                          <select
                            value={reviewDrafts[coach.coach_id]?.rating ?? 5}
                            onChange={(e) =>
                              setReviewDrafts((prev) => ({
                                ...prev,
                                [coach.coach_id]: {
                                  rating: Number(e.target.value),
                                  review_text: prev[coach.coach_id]?.review_text ?? "",
                                },
                              }))
                            }
                            className="mb-2 w-full rounded-lg border border-white/10 bg-[#080D19] px-3 py-2 text-xs text-gray-300 outline-none"
                          >
                            {[5, 4, 3, 2, 1].map((value) => (
                              <option key={value} value={value}>
                                {value} star{value !== 1 ? "s" : ""}
                              </option>
                            ))}
                          </select>
                          <textarea
                            value={reviewDrafts[coach.coach_id]?.review_text ?? ""}
                            onChange={(e) =>
                              setReviewDrafts((prev) => ({
                                ...prev,
                                [coach.coach_id]: {
                                  rating: prev[coach.coach_id]?.rating ?? 5,
                                  review_text: e.target.value,
                                },
                              }))
                            }
                            rows={3}
                            placeholder="Share your experience with this coach"
                            className="w-full rounded-lg border border-white/10 bg-[#080D19] px-3 py-2 text-xs text-white outline-none placeholder:text-gray-600"
                          />
                          <button
                            onClick={() => handleReviewSubmit(coach.coach_id)}
                            disabled={submittingReviewId === coach.coach_id}
                            className="mt-2 w-full rounded-lg bg-blue-600 py-2 text-xs font-medium text-white transition-colors hover:bg-blue-700 disabled:bg-blue-900/40"
                          >
                            {submittingReviewId === coach.coach_id ? "Submitting..." : "Submit Review"}
                          </button>
                        </div>

                        <div className="rounded-xl bg-[#0B1220] p-3">
                          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Report Coach</p>
                          <p className="mb-2 text-xs text-gray-400">
                            {reports.length} submitted report{reports.length !== 1 ? "s" : ""}
                          </p>
                          <textarea
                            value={reportDrafts[coach.coach_id] ?? ""}
                            onChange={(e) =>
                              setReportDrafts((prev) => ({
                                ...prev,
                                [coach.coach_id]: e.target.value,
                              }))
                            }
                            rows={3}
                            placeholder="Describe the issue you want to report"
                            className="w-full rounded-lg border border-white/10 bg-[#080D19] px-3 py-2 text-xs text-white outline-none placeholder:text-gray-600"
                          />
                          <button
                            onClick={() => handleReportSubmit(coach.coach_id)}
                            disabled={submittingReportId === coach.coach_id}
                            className="mt-2 w-full rounded-lg border border-red-500/30 bg-red-900/20 py-2 text-xs font-medium text-red-300 transition-colors hover:bg-red-900/30 disabled:opacity-50"
                          >
                            {submittingReportId === coach.coach_id ? "Submitting..." : "Submit Report"}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => toggleExpanded(coach.coach_id)}
                      className="flex-1 border border-white/10 text-gray-300 hover:bg-white/5 rounded-xl py-2.5 text-sm font-medium transition-colors"
                    >
                      {isExpanded ? "Show Less" : "View Details"}
                    </button>
                    {isRequested ? (
                      <button
                        onClick={() => handleCancelRequest(coach.coach_id)}
                        disabled={!pendingRequests[coach.coach_id] || isRequesting}
                        className="flex-1 bg-green-900/30 text-green-400 border border-green-500/30 rounded-xl py-2.5 text-sm font-medium disabled:cursor-default disabled:opacity-70"
                      >
                        {isRequesting ? "Cancelling..." : pendingRequests[coach.coach_id] ? "Cancel Request" : "Request Sent"}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleRequest(coach.coach_id)}
                        disabled={isRequesting}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-900/40 text-white rounded-xl py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed"
                      >
                        {isRequesting ? "Sending..." : "Request Coach"}
                      </button>
                    )}
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
