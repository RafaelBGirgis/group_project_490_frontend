/**
 * Coach reviews detail overlay.
 *
 * Props:
 *   reviews  – [{ id, client_name, rating, comment, created_at }]
 *   avgRating – number
 *   totalCount – number
 */
export default function ReviewsDetail({ reviews, avgRating, totalCount }) {
  return (
    <>
      {/* Summary */}
      <div className="bg-[#0A1020] rounded-xl p-5 flex items-center gap-6">
        <div className="text-center">
          <p className="text-yellow-400 font-bold text-3xl">{avgRating ?? "—"}</p>
          <p className="text-yellow-400 text-sm mt-0.5">
            {"★".repeat(Math.round(avgRating ?? 0))}{"☆".repeat(5 - Math.round(avgRating ?? 0))}
          </p>
        </div>
        <div>
          <p className="text-white font-bold text-base">{totalCount ?? reviews.length} Reviews</p>
          <p className="text-gray-400 text-xs mt-0.5">Overall rating from your clients</p>
        </div>
      </div>

      {/* Review list */}
      {reviews.length === 0 ? (
        <p className="text-gray-500 text-sm text-center py-8">No reviews yet</p>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <div
              key={r.id}
              className="rounded-xl border border-white/5 bg-[rgba(255,255,255,0.02)] p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-orange-900/40 flex items-center justify-center text-orange-400 font-bold text-[10px] shrink-0">
                    {r.client_name.split(" ").map((n) => n[0]).join("")}
                  </div>
                  <p className="text-white font-semibold text-sm">{r.client_name}</p>
                </div>
                <span className="text-gray-600 text-[10px]">{r.created_at}</span>
              </div>
              <p className="text-yellow-400 text-xs mb-1">
                {"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}
              </p>
              <p className="text-gray-300 text-sm">{r.comment}</p>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
