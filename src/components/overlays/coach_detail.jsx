/**
 * Coach details for client view overlay.
 * Modified by Ricardo
 *
 * Props:
 *   reviews  – [{ id, client_name, rating, comment, created_at }]
 */
import { StarIcon as SolidStar } from '@heroicons/react/24/solid'
import { StatusBadge } from '../../components'

/* ── star display helper ─────────────────────────────────────────── */
function Stars({ rating }) {
  const full  = Math.floor(rating);
  const half  = rating - full >= 0.25;
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

export default function CoachDetail({
  coach,
  reviews,
  reports,
  loadingDetailsId,
  reviewDrafts,
  reportDrafts,
  submittingReviewId,
  submittingReportId,
  onReviewSubmit,
  onReportSubmit,
  setReviewDrafts,
  setReportDrafts,
}) {
  const avgRating = (reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : null);
  const totalCount = reviews.length;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="rounded-2xl border border-white/6 bg-[#0F1729] p-5">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-full bg-blue-900/40 flex items-center justify-center text-blue-400 font-bold text-lg shrink-0">
            {coach?.name?.split(" ").map((n) => n[0]).join("") ?? "?"}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-white font-bold text-sm truncate">{coach?.name}</p>
              {coach?.verified && <StatusBadge label="Verified" variant="success" dot />}
            </div>

            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {(coach?.specialties || []).map((specialty) => (
                <span
                  key={specialty}
                  className="bg-blue-500/10 text-blue-400 text-[10px] font-medium px-2 py-0.5 rounded-full"
                >
                  {specialty}
                </span>
              ))}
            </div>

            <span className="inline-flex items-center text-yellow-400 text-sm leading-none tracking-normal">
              <Stars rating={coach?.rating_avg ?? 0} />
              <span className="text-gray-600 ml-2">
                {coach?.rating_avg?.toFixed(1)} · {coach?.review_count} review{coach?.review_count !== 1 ? "s" : ""}
              </span>
            </span>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-white/5">
          <div className="flex gap-4">
            <div className="flex-1 text-center">
              <p className="text-white font-bold text-sm">{coach?.age ?? "—"}</p>
              <p className="text-gray-500 text-[10px] uppercase tracking-wider">Age</p>
            </div>
            <div className="flex-1 text-center">
              <p className="text-white font-bold text-sm">{coach?.gender ?? "—"}</p>
              <p className="text-gray-500 text-[10px] uppercase tracking-wider">Gender</p>
            </div>
            <div className="flex-1 text-center">
              <p className="text-white font-bold text-sm">{coach?.certifications?.length ?? 0}</p>
              <p className="text-gray-500 text-[10px] uppercase tracking-wider">Certs</p>
            </div>
            <div className="flex-1 text-center">
              <p className="text-white font-bold text-sm">{coach?.review_count ?? 0}</p>
              <p className="text-gray-500 text-[10px] uppercase tracking-wider">Reviews</p>
            </div>
          </div>

          {coach?.certifications?.length > 0 && (
            <div className="mt-3 pt-3 border-t border-white/5">
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
          )}
        </div>
      </div>

      {/* Bio */}
      {coach?.bio && (
        <div>
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">About</p>
          <p className="text-gray-300 text-xs leading-relaxed">{coach.bio}</p>
        </div>
      )}

      {/* Summary */}
      <div className="bg-[#0A1020] rounded-xl p-5 flex items-center gap-6">
        <div className="text-center">
          <p className="text-yellow-400 font-bold text-3xl">{avgRating != null ? avgRating.toFixed(1) : "—"}</p>
          <span className="inline-flex text-left items-center text-yellow-400 text-sm leading-none tracking-normal">
            <Stars rating={avgRating} />
          </span>
        </div>
        <div>
          <p className="text-white font-bold text-base">{totalCount ?? reviews.length} Reviews</p>
          <p className="text-gray-400 text-xs mt-0.5">Overall rating from your clients</p>
        </div>
      </div>

      {/* Review list */}
      {loadingDetailsId === coach?.coach_id ? (
        <p className="text-gray-500 text-sm text-center py-8">Loading reviews...</p>
      ) : reviews.length === 0 ? (
        <p className="text-gray-500 text-sm text-center py-8">No reviews yet</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {reviews.slice(0, 6).map((r) => (
            <div
              key={r.id}
              className="rounded-xl border border-white/5 bg-[rgba(255,255,255,0.02)] p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-orange-900/40 flex items-center justify-center text-orange-400 font-bold text-[10px] shrink-0">
                    C{r.client_id}
                  </div>
                  <p className="text-white font-semibold text-sm">Client {r.client_id}</p>
                </div>
                <span className="text-gray-600 text-[14px]">
                  {r.last_updated ? new Date(r.last_updated).toLocaleDateString() : ""}
                </span>
              </div>
              <span className="inline-flex text-left items-center text-yellow-400 text-sm leading-none tracking-normal">
                <Stars rating={r.rating} />
              </span>
              <p className="text-gray-300 text-sm">{r.review_text}</p>
            </div>
          ))}
        </div>
      )}
      <div className="grid gap-3 md:grid-cols-2">
        {/* Leave Review */}
        <div className="rounded-xl bg-[#0B1220] p-3">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Leave Review</p>
          <select
            value={reviewDrafts[coach?.coach_id]?.rating ?? 5}
            onChange={(e) =>
              setReviewDrafts((prev) => ({
                ...prev,
                [coach?.coach_id]: {
                  rating: Number(e.target.value),
                  review_text: prev[coach?.coach_id]?.review_text ?? "",
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
            value={reviewDrafts[coach?.coach_id]?.review_text ?? ""}
            onChange={(e) =>
              setReviewDrafts((prev) => ({
                ...prev,
                [coach?.coach_id]: {
                  rating: prev[coach?.coach_id]?.rating ?? 5,
                  review_text: e.target.value,
                },
              }))
            }
            rows={3}
            placeholder="Share your experience with this coach"
            className="w-full rounded-lg border border-white/10 bg-[#080D19] px-3 py-2 text-xs text-white outline-none placeholder:text-gray-600"
          />
          <button
            onClick={() => onReviewSubmit(coach?.coach_id)}
            disabled={submittingReviewId === coach?.coach_id}
            className="mt-2 w-full rounded-lg bg-blue-600 py-2 text-xs font-medium text-white transition-colors hover:bg-blue-700 disabled:bg-blue-900/40"
          >
            {submittingReviewId === coach?.coach_id ? "Submitting..." : "Submit Review"}
          </button>
        </div>

        {/* Report Coach */}
        <div className="rounded-xl bg-[#0B1220] p-3">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Report Coach</p>
          <p className="mb-2 text-xs text-gray-400">
            {reports.length} submitted report{reports.length !== 1 ? "s" : ""}
          </p>
          <textarea
            value={reportDrafts[coach?.coach_id] ?? ""}
            onChange={(e) =>
              setReportDrafts((prev) => ({
                ...prev,
                [coach?.coach_id]: e.target.value,
              }))
            }
            rows={3}
            placeholder="Describe the issue you want to report"
            className="w-full rounded-lg border border-white/10 bg-[#080D19] px-3 py-2 text-xs text-white outline-none placeholder:text-gray-600"
          />
          <button
            onClick={() => onReportSubmit(coach?.coach_id)}
            disabled={submittingReportId === coach?.coach_id}
            className="mt-2 w-full rounded-lg border border-red-500/30 bg-red-900/20 py-2 text-xs font-medium text-red-300 transition-colors hover:bg-red-900/30 disabled:opacity-50"
          >
            {submittingReportId === coach?.coach_id ? "Submitting..." : "Submit Report"}
          </button>
        </div>
      </div>

    </div>
  );
}
