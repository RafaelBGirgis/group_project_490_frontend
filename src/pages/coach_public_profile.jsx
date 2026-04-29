import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Navbar, StatusBadge } from "../components";
import {
  createCoachReport,
  createCoachReview,
  deleteCoachRequest,
  fetchAvailableCoaches,
  fetchCoachReports,
  fetchCoachReviews,
  fetchMe,
  requestCoach,
  terminateRelationship,
} from "../api/client";
import { fetchCoachAvailability, fetchCoachProfile } from "../api/coach";
import {
  readClientCoachRequests,
  removeClientCoachRequest,
  saveClientCoachRequest,
} from "../utils/coachRequests";
import { getCoachAccessState } from "../utils/roleAccess";

function Stars({ rating = 0 }) {
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

function Modal({ open, title, children, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0F1729] p-5 shadow-[0_0_40px_rgba(0,0,0,0.5)]">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/10 px-3 py-1 text-xs text-slate-300 hover:bg-white/5"
          >
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function normalizeStoredCoachProfile(account, coachProfile) {
  const storageKey = `coach_profile:${coachProfile?.coach_account?.id || account?.coach_id || account?.id || "current"}`;
  let stored = null;
  try {
    stored = JSON.parse(localStorage.getItem(storageKey) || "null");
  } catch {
    stored = null;
  }

  const specialties = Array.isArray(stored?.specializations)
    ? stored.specializations
    : String(coachProfile?.coach_account?.specialties || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

  const certifications = Array.isArray(stored?.certifications)
    ? stored.certifications.map((item) => ({
        name: item.title || item.certification_name || "Certification",
        organization: item.issuer || item.certification_organization || "Organization",
        year: item.year || item.certification_date || "",
        description: item.description || item.certification_score || "",
      }))
    : [];

  const experiences = Array.isArray(stored?.experiences)
    ? stored.experiences.map((item) => ({
        title: item.title || item.experience_title || "Experience",
        organization: item.issuer || item.organization || item.experience_name || "",
        year: item.year || item.experience_start || "",
        description: item.description || item.experience_description || "",
      }))
    : [];

  return {
    coach_id: coachProfile?.coach_account?.id || account?.coach_id,
    name: account?.name || "Coach",
    email: account?.email || "",
    age: account?.age ?? null,
    gender: account?.gender || "",
    bio: account?.bio || "",
    pfp_url: account?.pfp_url || "",
    specialties,
    certifications,
    experiences,
    pricingInterval: stored?.pricingInterval || "",
    amount: stored?.amount || "",
    verified: Boolean(coachProfile?.coach_account?.verified),
    rating_avg: 0,
    review_count: 0,
  };
}

function readStoredCoachProfile(coachId) {
  if (!coachId) return null;
  try {
    return JSON.parse(localStorage.getItem(`coach_profile:${coachId}`) || "null");
  } catch {
    return null;
  }
}

function normalizeCoachMetadataFromStorage(stored) {
  return {
    specialties: Array.isArray(stored?.specializations) ? stored.specializations : null,
    certifications: Array.isArray(stored?.certifications)
      ? stored.certifications.map((item) => ({
          name: item.title || item.certification_name || "Certification",
          organization: item.issuer || item.certification_organization || "Organization",
          year: item.year || item.certification_date || "",
          description: item.description || item.certification_score || "",
        }))
      : null,
    experiences: Array.isArray(stored?.experiences)
      ? stored.experiences.map((item) => ({
          title: item.title || item.experience_title || "Experience",
          organization: item.issuer || item.organization || item.experience_name || "",
          year: item.year || item.experience_start || "",
          description: item.description || item.experience_description || "",
        }))
      : null,
    pricingInterval: stored?.pricingInterval || "",
    amount: stored?.amount || "",
  };
}

function mergeCoachWithStoredProfile(coach) {
  const stored = readStoredCoachProfile(coach?.coach_id);
  if (!stored) return coach;

  const normalizedStored = normalizeCoachMetadataFromStorage(stored);
  return {
    ...coach,
    specialties: normalizedStored.specialties || coach.specialties || [],
    certifications: normalizedStored.certifications || coach.certifications || [],
    experiences: normalizedStored.experiences || coach.experiences || [],
    pricingInterval: normalizedStored.pricingInterval || coach.pricingInterval || "",
    amount: normalizedStored.amount || coach.amount || "",
  };
}

function formatPaymentPlan(coach) {
  const amount = String(coach?.amount || "").trim();
  const interval = String(coach?.pricingInterval || "").trim().toLowerCase();
  if (!amount && !interval) return "No payment plan listed yet.";

  const parsedAmount = Number(amount);
  const amountLabel = Number.isFinite(parsedAmount) && amount !== ""
    ? `$${parsedAmount.toFixed(2)}`
    : amount;
  const intervalLabel = interval || "plan";
  return `${amountLabel}${amountLabel ? " / " : ""}${intervalLabel}`;
}

export default function CoachPublicProfilePage() {
  const navigate = useNavigate();
  const { coachId: coachIdParam } = useParams();
  const [searchParams] = useSearchParams();
  const previewMode = searchParams.get("preview") === "1";
  const coachId = Number(coachIdParam);

  const [account, setAccount] = useState(null);
  const [coach, setCoach] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [reports, setReports] = useState([]);
  const [availability, setAvailability] = useState([]);
  const [pendingRequests, setPendingRequests] = useState({});
  const [loading, setLoading] = useState(true);
  const [canSwitchToCoach, setCanSwitchToCoach] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [requesting, setRequesting] = useState(false);
  const [terminating, setTerminating] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reviewDraft, setReviewDraft] = useState({ rating: 5, review_text: "" });
  const [reportDraft, setReportDraft] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [submittingReport, setSubmittingReport] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("jwt");
    if (!token) {
      navigate("/login");
      return;
    }

    const loadPage = async () => {
      try {
        const me = await fetchMe();
        setAccount(me);
        const coachAccess = await getCoachAccessState(me);
        setCanSwitchToCoach(coachAccess.canAccessCoach);

        if (me?.email) {
          setPendingRequests(readClientCoachRequests(me.email));
        }

        if (previewMode && Number(me?.coach_id) === coachId) {
          const coachProfile = await fetchCoachProfile().catch(() => null);
          setCoach(normalizeStoredCoachProfile(me, coachProfile));
        } else {
          const availableCoaches = await fetchAvailableCoaches({ limit: 1000 }).catch(() => []);
          const matchedCoach = availableCoaches.find((item) => Number(item.coach_id) === coachId);

          if (matchedCoach) {
            setCoach(mergeCoachWithStoredProfile(matchedCoach));
          } else {
            setActionError("Unable to load this coach profile.");
          }
        }

        const [reviewResponse, reportResponse, availabilityResponse] = await Promise.all([
          fetchCoachReviews(coachId).catch(() => ({ reviews: [] })),
          fetchCoachReports(coachId).catch(() => ({ reports: [] })),
          fetchCoachAvailability(coachId).catch(() => []),
        ]);

        setReviews(Array.isArray(reviewResponse?.reviews) ? reviewResponse.reviews : []);
        setReports(Array.isArray(reportResponse?.reports) ? reportResponse.reports : []);
        setAvailability(Array.isArray(availabilityResponse) ? availabilityResponse : []);
      } catch (error) {
        setActionError(error.message || "Unable to load this coach profile.");
      } finally {
        setLoading(false);
      }
    };

    loadPage();
  }, [coachId, navigate, previewMode]);

  const userInitials = useMemo(() => {
    const name = account?.name || "";
    return name
      ? name.split(" ").map((item) => item[0]).join("").toUpperCase()
      : "?";
  }, [account?.name]);

  const requestEntry = pendingRequests[coachId];
  const relationshipId = requestEntry?.relationship_id
    || (account?.client_id ? localStorage.getItem(`client_relationship:${account.client_id}:${coachId}`) : null);
  const requestStatus = requestEntry?.status || null;
  const hasRelationshipHistory = Boolean(
    relationshipId
    || requestEntry?.relationship_id
    || requestEntry?.status === "approved"
  );
  const canReview = !previewMode && hasRelationshipHistory;
  const isPending = requestStatus === "pending";
  const isApproved = requestStatus === "approved";

  const handleRequestCoach = async () => {
    if (!account?.client_id) {
      setActionError("You need to finish client onboarding before requesting a coach.");
      return;
    }
    setRequesting(true);
    setActionError("");
    setActionMessage("");
    try {
      const response = await requestCoach(account.client_id, coachId);
      const requestData = {
        request_id: response?.request_id,
        coach_id: coachId,
        coach_name: coach?.name || `Coach #${coachId}`,
        coach_email: coach?.email || "",
        status: "pending",
        relationship_id: null,
      };
      saveClientCoachRequest(account.email, coachId, requestData);
      setPendingRequests((prev) => ({ ...prev, [coachId]: requestData }));
      setActionMessage("Coach request sent.");
    } catch (error) {
      setActionError(error.message || "Unable to request this coach.");
    } finally {
      setRequesting(false);
    }
  };

  const handleCancelRequest = async () => {
    if (!requestEntry?.request_id) return;
    setRequesting(true);
    setActionError("");
    setActionMessage("");
    try {
      await deleteCoachRequest(requestEntry.request_id);
      removeClientCoachRequest(account?.email, coachId);
      setPendingRequests((prev) => {
        const next = { ...prev };
        delete next[coachId];
        return next;
      });
      setActionMessage("Coach request cancelled.");
    } catch (error) {
      setActionError(error.message || "Unable to cancel this coach request.");
    } finally {
      setRequesting(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!canReview) {
      setActionError("You can leave a review only if you have or had a real relationship with this coach.");
      return;
    }
    if (!reviewDraft.review_text.trim()) return;
    setSubmittingReview(true);
    setActionError("");
    try {
      await createCoachReview(coachId, reviewDraft.rating, reviewDraft.review_text.trim());
      const reviewResponse = await fetchCoachReviews(coachId).catch(() => ({ reviews: [] }));
      setReviews(Array.isArray(reviewResponse?.reviews) ? reviewResponse.reviews : []);
      setReviewDraft({ rating: 5, review_text: "" });
      setReviewModalOpen(false);
      setActionMessage("Review submitted.");
    } catch (error) {
      setActionError(error.message || "Unable to submit your review.");
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleSubmitReport = async () => {
    if (!reportDraft.trim()) return;
    setSubmittingReport(true);
    setActionError("");
    try {
      await createCoachReport(coachId, reportDraft.trim());
      const reportResponse = await fetchCoachReports(coachId).catch(() => ({ reports: [] }));
      setReports(Array.isArray(reportResponse?.reports) ? reportResponse.reports : []);
      setReportDraft("");
      setReportModalOpen(false);
      setActionMessage("Report submitted.");
    } catch (error) {
      setActionError(error.message || "Unable to submit your report.");
    } finally {
      setSubmittingReport(false);
    }
  };

  const handleTerminateRelationship = async () => {
    if (!relationshipId) {
      setActionError("No active relationship found for this coach.");
      return;
    }
    setTerminating(true);
    setActionError("");
    try {
      await terminateRelationship(Number(relationshipId));
      localStorage.removeItem(`client_relationship:${account?.client_id}:${coachId}`);
      removeClientCoachRequest(account?.email, coachId);
      setPendingRequests((prev) => {
        const next = { ...prev };
        delete next[coachId];
        return next;
      });
      setActionMessage("Coach relationship ended.");
    } catch (error) {
      setActionError(error.message || "Unable to end this relationship.");
    } finally {
      setTerminating(false);
    }
  };

  const renderBackButton = () => {
    if (previewMode) {
      return (
        <button
          onClick={() => navigate("/coach-profile")}
          className="rounded-lg border border-orange-500/30 bg-orange-500/10 px-4 py-2 text-sm font-medium text-orange-300"
        >
          Back to Coach Profile
        </button>
      );
    }
    return (
      <button
        onClick={() => navigate("/find-coach")}
        className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-sm font-medium text-blue-300"
      >
        Back to Find Coach
      </button>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080D19]">
        <Navbar role={previewMode ? "coach" : "client"} userName={userInitials} canSwitchToCoach={canSwitchToCoach} />
        <div className="mx-auto max-w-6xl px-6 py-6">
          <div className="h-16 rounded-2xl bg-white/5 animate-pulse" />
        </div>
      </div>
    );
  }

  const ratingAvg = Number(coach?.rating_avg ?? 0);
  const reviewCount = Number(coach?.review_count ?? reviews.length ?? 0);
  const initials = coach?.name ? coach.name.split(" ").map((item) => item[0]).join("").toUpperCase() : "?";
  const paymentPlan = formatPaymentPlan(coach);

  return (
    <div className="min-h-screen bg-[#080D19]">
      <Navbar role={previewMode ? "coach" : "client"} userName={userInitials} canSwitchToCoach={canSwitchToCoach} />

      <div className="mx-auto max-w-6xl px-6 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">
              {previewMode ? "Public Coach Profile Preview" : "Coach Profile"}
            </h1>
          </div>
          {renderBackButton()}
        </div>

        {actionError ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {actionError}
          </div>
        ) : null}

        {actionMessage ? (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
            {actionMessage}
          </div>
        ) : null}

        {!coach ? (
          <div className="rounded-2xl border border-white/8 bg-[#0F1729] p-6 text-sm text-gray-400">
            Coach profile not available.
          </div>
        ) : (
          <>
            <section className="grid gap-6">
              <div className="rounded-2xl border border-white/8 bg-[#0F1729] p-6">
                <div className="flex items-start gap-5">
                  <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-blue-900/40 text-2xl font-bold text-blue-300">
                    {coach.pfp_url ? (
                      <img src={coach.pfp_url} alt={coach.name} className="h-20 w-20 object-cover" />
                    ) : (
                      initials
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h2 className="truncate text-2xl font-bold text-white">{coach.name}</h2>
                      {coach.verified && <StatusBadge label="Verified" variant="success" dot />}
                    </div>
                    <p className="mt-2 text-sm text-gray-400">{coach.email || "Verified coach"}</p>
                    <div className="mt-3 flex items-center gap-2">
                      <Stars rating={ratingAvg} />
                      <span className="text-sm text-gray-400">
                        {ratingAvg.toFixed(1)} · {reviewCount} review{reviewCount !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {(coach.specialties || []).map((item) => (
                        <span key={item} className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-300">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  <div className="rounded-xl bg-[#0B1220] p-4">
                    <p className="text-[10px] uppercase tracking-widest text-gray-500">Age</p>
                    <p className="mt-2 text-sm font-semibold text-white">{coach.age ?? "—"}</p>
                  </div>
                  <div className="rounded-xl bg-[#0B1220] p-4">
                    <p className="text-[10px] uppercase tracking-widest text-gray-500">Gender</p>
                    <p className="mt-2 text-sm font-semibold text-white">{coach.gender || "—"}</p>
                  </div>
                  <div className="rounded-xl bg-[#0B1220] p-4">
                    <p className="text-[10px] uppercase tracking-widest text-gray-500">Experience Entries</p>
                    <p className="mt-2 text-sm font-semibold text-white">{coach.experiences?.length ?? 0}</p>
                  </div>
                </div>

                <div className="mt-4 rounded-xl bg-[#0B1220] p-4">
                  <p className="text-[10px] uppercase tracking-widest text-gray-500">Payment Plan</p>
                  <p className="mt-2 text-sm font-semibold text-white">{paymentPlan}</p>
                </div>

                <div className="mt-6">
                  <p className="text-[10px] uppercase tracking-widest text-gray-500">About</p>
                  <p className="mt-2 text-sm leading-relaxed text-gray-300">
                    {coach.bio || "No coach bio provided yet."}
                  </p>
                </div>
              </div>
            </section>

            {!previewMode && (
              <section className="rounded-2xl border border-white/8 bg-[#0F1729] p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base font-bold text-white">Client Actions</h3>
                    <p className="mt-1 text-xs text-gray-500">
                      Relationship and feedback actions for this coach.
                    </p>
                  </div>
                  {isApproved ? (
                    <div className="rounded-xl border border-green-500/30 bg-green-500/10 px-3 py-2 text-xs font-medium text-green-300">
                      Relationship approved
                    </div>
                  ) : null}
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {isPending ? (
                    <button
                      type="button"
                      onClick={handleCancelRequest}
                      disabled={requesting}
                      className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm font-medium text-amber-300 disabled:opacity-60"
                    >
                      {requesting ? "Cancelling..." : "Cancel Request"}
                    </button>
                  ) : !isApproved ? (
                    <button
                      type="button"
                      onClick={handleRequestCoach}
                      disabled={requesting}
                      className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white disabled:bg-blue-900/40"
                    >
                      {requesting ? "Sending..." : "Request Coach"}
                    </button>
                  ) : (
                    <div className="hidden md:block" />
                  )}

                  {canReview ? (
                    <button
                      type="button"
                      onClick={() => {
                        setActionError("");
                        setReviewModalOpen(true);
                      }}
                      className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm font-medium text-yellow-300"
                    >
                      Leave a Review
                    </button>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => {
                      setActionError("");
                      setReportModalOpen(true);
                    }}
                    className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-300"
                  >
                    Report Coach
                  </button>

                  {relationshipId ? (
                    <button
                      type="button"
                      onClick={handleTerminateRelationship}
                      disabled={terminating}
                      className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-medium text-slate-300 disabled:opacity-50"
                    >
                      {terminating ? "Ending..." : "End Relationship"}
                    </button>
                  ) : null}
                </div>
              </section>
            )}

            <section className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-white/8 bg-[#0F1729] p-6">
                <h3 className="text-lg font-bold text-white">Certifications</h3>
                <div className="mt-4 space-y-3">
                  {coach.certifications?.length ? coach.certifications.map((item, index) => (
                    <div key={`${item.name}-${index}`} className="rounded-xl bg-[#0B1220] p-4">
                      <p className="text-sm font-semibold text-white">{item.name}</p>
                      <p className="mt-1 text-xs text-blue-300">{item.organization}</p>
                      {item.year ? <p className="mt-1 text-[11px] text-gray-500">{item.year}</p> : null}
                      {item.description ? <p className="mt-2 text-xs text-gray-300">{item.description}</p> : null}
                    </div>
                  )) : (
                    <p className="text-sm text-gray-500">No certifications listed yet.</p>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-white/8 bg-[#0F1729] p-6">
                <h3 className="text-lg font-bold text-white">Experience</h3>
                <div className="mt-4 space-y-3">
                  {coach.experiences?.length ? coach.experiences.map((item, index) => (
                    <div key={`${item.title}-${index}`} className="rounded-xl bg-[#0B1220] p-4">
                      <p className="text-sm font-semibold text-white">{item.title}</p>
                      <p className="mt-1 text-xs text-blue-300">{item.organization}</p>
                      {item.year ? <p className="mt-1 text-[11px] text-gray-500">{item.year}</p> : null}
                      {item.description ? <p className="mt-2 text-xs text-gray-300">{item.description}</p> : null}
                    </div>
                  )) : (
                    <p className="text-sm text-gray-500">No experience entries listed yet.</p>
                  )}
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-white/8 bg-[#0F1729] p-6">
              <h3 className="text-lg font-bold text-white">Availability</h3>
              <div className="mt-4">
                {availability.length === 0 ? (
                  <p className="text-sm text-gray-500">No coach availability has been set yet.</p>
                ) : (
                  <>
                    <div className="grid grid-cols-8 gap-1 mb-2">
                      <div />
                      {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                        <div key={day} className="text-[10px] text-gray-500 text-center font-medium">
                          {day}
                        </div>
                      ))}
                    </div>
                    <div className="space-y-1">
                      {availability.map(({ time, slots }) => (
                        <div key={time} className="grid grid-cols-8 gap-1">
                          <div className="text-[10px] text-gray-500 flex items-center">{time}</div>
                          {slots.map((status, index) => (
                            <div
                              key={`${time}-${index}`}
                              className={`rounded py-1 text-center text-[10px] font-medium ${
                                status === "available"
                                  ? "bg-blue-900/60 text-blue-300"
                                  : "bg-[#0A1020] text-gray-700"
                              }`}
                            >
                              {status === "available" ? time : "—"}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-white/8 bg-[#0F1729] p-6">
              <h3 className="text-lg font-bold text-white">Recent Reviews</h3>
              <div className="mt-4 space-y-3">
                {reviews.length ? reviews.slice(0, 5).map((review) => (
                  <div key={review.id} className="rounded-xl bg-[#0B1220] p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-yellow-400 text-xs">
                        {"★".repeat(Math.max(0, Math.round(Number(review.rating || 0))))}
                      </span>
                      <span className="text-[11px] text-gray-500">
                        {review.last_updated ? new Date(review.last_updated).toLocaleDateString() : ""}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-gray-300">{review.review_text}</p>
                  </div>
                )) : (
                  <p className="text-sm text-gray-500">No reviews available yet.</p>
                )}
              </div>
            </section>
          </>
        )}
      </div>

      <Modal open={reviewModalOpen} title="Leave a Review" onClose={() => setReviewModalOpen(false)}>
        <div className="space-y-3">
          <select
            value={reviewDraft.rating}
            onChange={(event) => setReviewDraft((prev) => ({ ...prev, rating: Number(event.target.value) }))}
            className="w-full rounded-lg border border-white/10 bg-[#080D19] px-3 py-2 text-sm text-white outline-none"
          >
            {[5, 4, 3, 2, 1].map((value) => (
              <option key={value} value={value}>
                {value} star{value !== 1 ? "s" : ""}
              </option>
            ))}
          </select>
          <textarea
            rows={4}
            value={reviewDraft.review_text}
            onChange={(event) => setReviewDraft((prev) => ({ ...prev, review_text: event.target.value }))}
            placeholder="Share your experience with this coach"
            className="w-full rounded-lg border border-white/10 bg-[#080D19] px-3 py-2 text-sm text-white outline-none placeholder:text-gray-600"
          />
          <button
            type="button"
            onClick={handleSubmitReview}
            disabled={submittingReview}
            className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white disabled:bg-blue-900/40"
          >
            {submittingReview ? "Submitting..." : "Submit Review"}
          </button>
        </div>
      </Modal>

      <Modal open={reportModalOpen} title="Report Coach" onClose={() => setReportModalOpen(false)}>
        <div className="space-y-3">
          <textarea
            rows={5}
            value={reportDraft}
            onChange={(event) => setReportDraft(event.target.value)}
            placeholder="Describe the issue you want to report"
            className="w-full rounded-lg border border-white/10 bg-[#080D19] px-3 py-2 text-sm text-white outline-none placeholder:text-gray-600"
          />
          <button
            type="button"
            onClick={handleSubmitReport}
            disabled={submittingReport}
            className="w-full rounded-xl border border-red-500/30 bg-red-900/20 px-4 py-3 text-sm font-semibold text-red-300 disabled:opacity-60"
          >
            {submittingReport ? "Submitting..." : "Submit Report"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
