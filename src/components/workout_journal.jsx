import { useState, useEffect, useCallback } from "react";

function isoToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function offsetDate(iso, days) {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatDayLabel(iso) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric", year: "numeric" });
}

/**
 * Day-by-day Workout Journal showing planned vs. actual workout activity logs.
 *
 * Props:
 *   fetchDayData(isoDate) => Promise<{ cwps: [], planLookup: {}, logs: [] }>
 *     - cwps: ClientWorkoutPlan objects (each has workout_plan_id, occurrences)
 *     - planLookup: { [planId]: plan } where plan.activities[] has planned_reps/sets/duration, workout_name
 *     - logs: enriched CompletedWorkout objects with activity_name, completed_reps/sets/duration/estimated_calories
 *   accent: string
 */
export default function WorkoutJournal({ fetchDayData, accent = "#3B82F6" }) {
  const today = isoToday();
  const [date, setDate] = useState(today);
  const [loading, setLoading] = useState(false);
  const [dayData, setDayData] = useState(null);

  const load = useCallback(async (d) => {
    setLoading(true);
    setDayData(null);
    try {
      const result = await fetchDayData(d);
      setDayData(result);
    } catch {
      setDayData({ cwps: [], planLookup: {}, logs: [] });
    } finally {
      setLoading(false);
    }
  }, [fetchDayData]);

  useEffect(() => { load(date); }, [date, load]);

  return (
    <div>
      {/* Day navigation */}
      <div className="flex items-center justify-between mb-4 px-1">
        <button
          onClick={() => setDate((d) => offsetDate(d, -1))}
          className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/5 transition-colors"
        >
          ← Prev Day
        </button>
        <div className="text-center">
          <p className="text-sm font-semibold text-white">{formatDayLabel(date)}</p>
          {date === today && <span className="block text-[10px] font-medium" style={{ color: accent }}>Today</span>}
          {date > today && <span className="block text-[10px] text-slate-500">Future</span>}
        </div>
        <button
          onClick={() => setDate((d) => offsetDate(d, 1))}
          disabled={date >= today}
          className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Next Day →
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-slate-400 text-center py-6 animate-pulse">Loading...</p>
      ) : dayData ? (
        <JournalDayView data={dayData} accent={accent} />
      ) : null}
    </div>
  );
}

function formatPlanned(act) {
  // Activity objects from searchWorkoutPlans/_enrich_plan use:
  //   planned_reps, planned_sets, planned_duration, workout_type ("rep" | "duration")
  //   intensity_value, intensity_measure
  const isDuration = act.workout_type === "duration" || act.planned_duration != null;
  if (isDuration) {
    const sets = act.planned_sets ?? "—";
    const dur = act.planned_duration != null ? `${act.planned_duration}s` : "—";
    return `${sets} sets × ${dur}`;
  }
  const sets = act.planned_sets ?? "—";
  const reps = act.planned_reps ?? "—";
  const intensity = act.intensity_value != null
    ? ` @ ${act.intensity_value}${act.intensity_measure ? ` ${act.intensity_measure}` : ""}`
    : "";
  return `${sets} sets × ${reps} reps${intensity}`;
}

function formatActual(log) {
  // Enriched log objects have: completed_sets, completed_reps, completed_duration, estimated_calories
  const isDuration = log.completed_duration != null && log.completed_reps == null;
  const sets = log.completed_sets != null ? `${log.completed_sets} sets` : null;
  const metric = isDuration
    ? (log.completed_duration != null ? `${log.completed_duration}s` : null)
    : (log.completed_reps != null ? `${log.completed_reps} reps` : null);
  const kcal = log.estimated_calories != null ? `${log.estimated_calories} kcal` : null;

  const parts = [sets, metric ? `× ${metric}` : null, kcal ? `· ${kcal}` : null].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : "Logged";
}

function JournalDayView({ data, accent }) {
  const { cwps, planLookup, logs } = data;

  // Build lookup: workout_plan_activity_id → enriched log entry
  const logByActivityId = {};
  logs.forEach((l) => {
    const key = l.workout_plan_activity_id;
    if (key != null) {
      // Keep the first match per activity (most recent is first since ordered desc)
      if (!logByActivityId[key]) logByActivityId[key] = l;
    }
  });

  if (cwps.length === 0 && logs.length === 0) {
    return (
      <p className="text-sm text-slate-500 text-center py-6">
        No workouts planned or logged for this day.
      </p>
    );
  }

  // Collect all plan activity IDs shown in planned sections
  const shownActivityIds = new Set();

  return (
    <div className="space-y-3">
      {cwps.map((cwp) => {
        const plan = planLookup[cwp.workout_plan_id];
        const activities = plan?.activities ?? [];
        const occ = (cwp.occurrences ?? [])[0];
        const timeLabel = occ
          ? `${new Date(occ.start_dt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })} – ${new Date(occ.end_dt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`
          : "";

        const loggedCount = activities.filter((a) => logByActivityId[a.id]).length;
        const allLogged = activities.length > 0 && loggedCount === activities.length;
        const someLogged = loggedCount > 0;

        activities.forEach((a) => shownActivityIds.add(a.id));

        return (
          <div key={cwp.id} className="rounded-xl border border-white/6 bg-[#101827] overflow-hidden">
            {/* Plan header */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5">
              <div>
                <p className="text-xs font-semibold text-white">
                  {plan?.strata_name || `Plan #${cwp.workout_plan_id}`}
                </p>
                {timeLabel && <p className="text-[10px] text-slate-500 mt-0.5">{timeLabel}</p>}
              </div>
              {allLogged ? (
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 rounded-full px-2 py-0.5">
                  Complete
                </span>
              ) : someLogged ? (
                <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 rounded-full px-2 py-0.5">
                  Partial {loggedCount}/{activities.length}
                </span>
              ) : (
                <span className="text-[10px] font-bold text-slate-500 bg-slate-700/30 rounded-full px-2 py-0.5">
                  Not Logged
                </span>
              )}
            </div>

            {activities.length === 0 ? (
              <p className="text-xs text-slate-500 px-4 py-3">No activities in this plan.</p>
            ) : (
              <div className="divide-y divide-white/5">
                {activities.map((act) => {
                  const log = logByActivityId[act.id];
                  // activity name: _enrich_plan returns "workout_name"
                  const actName = act.workout_name || act.name || `Activity #${act.id}`;

                  return (
                    <div key={act.id} className="flex items-start justify-between gap-3 px-4 py-2.5">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-white truncate">{actName}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          Planned: {formatPlanned(act)}
                        </p>
                        {log && (
                          <p className="text-[10px] mt-0.5" style={{ color: accent }}>
                            Logged: {formatActual(log)}
                          </p>
                        )}
                      </div>
                      {log ? (
                        <span className="shrink-0 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 rounded-full px-2 py-0.5">
                          Logged
                        </span>
                      ) : (
                        <span className="shrink-0 text-[10px] font-bold text-slate-500 bg-slate-700/30 rounded-full px-2 py-0.5">
                          Pending
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* Logs not matched to any scheduled plan activity */}
      {(() => {
        const unmatched = logs.filter(
          (l) => l.workout_plan_activity_id == null || !shownActivityIds.has(l.workout_plan_activity_id)
        );
        if (unmatched.length === 0) return null;
        return (
          <div className="rounded-xl border border-white/6 bg-[#101827] p-4">
            <p className="text-xs font-semibold text-white mb-2">Additional Logged Activities</p>
            <div className="space-y-2">
              {unmatched.map((l, i) => (
                <div key={l.id ?? i} className="rounded-lg bg-[#0A1020] px-3 py-2 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium text-white">
                      {l.activity_name || `Workout #${l.id || i + 1}`}
                    </p>
                    <p className="text-[10px] mt-0.5" style={{ color: accent }}>
                      {formatActual(l)}
                    </p>
                  </div>
                  <span className="shrink-0 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 rounded-full px-2 py-0.5">
                    Logged
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
