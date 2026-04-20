import StatusBadge from "../status_badge";

/**
 * Full workout plan detail — shown when "View all" is clicked.
 *
 * Props:
 *   planName   – string (e.g. "Push Day")
 *   activities – array of workout activity objects
 *   weekdays   – ["Mon","Tue",...]
 *   activeDay  – index
 *   onDayChange – (idx) => void
 *   onLog      – (activityId) => void
 */
export default function WorkoutDetail({
  planName,
  activities,
  weekdays,
  activeDay,
  onDayChange,
  onLog,
}) {
  const completed = activities.filter((a) => a.logged).length;
  const total = activities.length;

  return (
    <>
      {/* Day selector */}
      <div className="flex gap-2">
        {weekdays.map((day, i) => (
          <button
            key={day}
            onClick={() => onDayChange(i)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              i === activeDay
                ? "bg-blue-600 text-white"
                : "bg-white/5 text-gray-400 hover:bg-white/10"
            }`}
          >
            {day}
          </button>
        ))}
      </div>

      {/* Summary bar */}
      <div className="flex items-center justify-between bg-[#0A1020] rounded-xl px-4 py-3">
        <div>
          <p className="text-white font-bold text-base">{planName || "Rest Day"}</p>
          <p className="text-gray-400 text-xs mt-0.5">
            {total === 0
              ? "No exercises scheduled"
              : `${completed} of ${total} exercises logged`}
          </p>
        </div>
        {total > 0 && (
          <div className="text-right">
            <p className="text-blue-400 font-bold text-xl">
              {Math.round((completed / total) * 100)}%
            </p>
            <p className="text-gray-500 text-[10px] uppercase tracking-widest">
              Complete
            </p>
          </div>
        )}
      </div>

      {/* Activity list */}
      {activities.length === 0 ? (
        <p className="text-gray-500 text-sm text-center py-8">
          No exercises for this day — enjoy your rest!
        </p>
      ) : (
        <div className="space-y-2">
          {activities.map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between rounded-xl border border-white/5 bg-[rgba(255,255,255,0.02)] px-4 py-3"
            >
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm">{a.name}</p>
                <div className="flex gap-3 mt-1">
                  <span className="text-gray-400 text-xs">
                    {a.suggested_sets} sets
                  </span>
                  <span className="text-gray-400 text-xs">
                    {a.suggested_reps} reps
                  </span>
                  <span className="text-blue-400/80 text-xs font-medium">
                    {a.intensity_value} {a.intensity_measure}
                  </span>
                </div>
              </div>
              <div className="ml-4 shrink-0">
                {a.logged ? (
                  <StatusBadge label="Logged ✓" variant="success" />
                ) : (
                  <button
                    className="text-blue-400 text-xs border border-blue-500/50 rounded-full px-4 py-1.5 hover:bg-blue-500/10 transition-colors"
                    onClick={() => onLog(a.id)}
                  >
                    Log →
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Total estimated calories */}
      {activities.length > 0 && (
        <div className="flex justify-between items-center pt-3 border-t border-white/5">
          <span className="text-xs text-gray-500 uppercase tracking-widest">
            Est. Calories Burned
          </span>
          <span className="text-white font-bold">
            {activities.reduce(
              (sum, a) =>
                sum +
                (a.estimated_calories_per_unit_frequency ?? 8) *
                  a.suggested_sets *
                  a.suggested_reps,
              0
            )}{" "}
            kcal
          </span>
        </div>
      )}
    </>
  );
}
