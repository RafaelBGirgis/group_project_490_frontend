/**
 * Coach profile detail — shown when "View Profile" is clicked.
 *
 * Props:
 *   coach       – { name, specialty, pfp_url, coach_id }
 *   rating      – { avg, review_count }
 *   nextSession – { weekday, start_time }
 *   onMessage   – () => void
 */
export default function CoachProfile({ coach, rating, nextSession, onMessage }) {
  if (!coach) {
    return (
      <p className="text-gray-500 text-sm text-center py-8">
        No coach assigned yet.
      </p>
    );
  }

  const initials = coach.name
    ?.split(" ")
    .map((n) => n[0])
    .join("") ?? "?";

  return (
    <>
      {/* Coach header */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-blue-900/40 flex items-center justify-center text-blue-400 font-bold text-xl shrink-0">
          {coach.pfp_url ? (
            <img
              src={coach.pfp_url}
              alt={coach.name}
              className="w-16 h-16 rounded-full object-cover"
            />
          ) : (
            initials
          )}
        </div>
        <div>
          <p className="text-white font-bold text-xl">{coach.name}</p>
          <p className="text-gray-400 text-sm">{coach.specialty}</p>
          {rating && (
            <p className="text-yellow-400 text-sm mt-0.5">
              ★ {rating.avg} · {rating.review_count} reviews
            </p>
          )}
        </div>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#0A1020] rounded-xl p-4">
          <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">
            Specialty
          </p>
          <p className="text-white text-sm font-medium">{coach.specialty}</p>
        </div>
        <div className="bg-[#0A1020] rounded-xl p-4">
          <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">
            Next Session
          </p>
          <p className="text-white text-sm font-medium">
            {nextSession
              ? `${nextSession.weekday} · ${nextSession.start_time}`
              : "Not scheduled"}
          </p>
        </div>
        <div className="bg-[#0A1020] rounded-xl p-4">
          <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">
            Rating
          </p>
          <p className="text-white text-sm font-medium">
            {rating ? `${rating.avg} / 5.0` : "No ratings yet"}
          </p>
        </div>
        <div className="bg-[#0A1020] rounded-xl p-4">
          <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">
            Reviews
          </p>
          <p className="text-white text-sm font-medium">
            {rating ? `${rating.review_count} total` : "—"}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3 text-sm font-medium transition-colors"
          onClick={onMessage}
        >
          💬 Send Message
        </button>
        <button
          className="flex-1 border border-gray-700 text-gray-300 hover:bg-gray-800 rounded-xl py-3 text-sm transition-colors"
          onClick={() => {}}
        >
          ★ Leave a Review
        </button>
      </div>
    </>
  );
}
