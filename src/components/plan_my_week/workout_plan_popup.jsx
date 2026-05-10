import { useMemo, useState } from "react";
import { HMSDuration } from "../HMSDuration";
import { formatDuration } from "../../utils/duration";

function fmtTime(isoStr) {
  if (!isoStr) return "—";
  return new Date(isoStr).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function deriveCpuf(activity, isDuration) {
  const est = Number(activity.estimated_calories || 0);
  if (!est) return 0;
  if (isDuration) {
    const freq = Number(activity.planned_duration || 0);
    return freq > 0 ? est / freq : 0;
  }
  const freq = Number(activity.planned_reps || 0) * Number(activity.planned_sets || 0);
  return freq > 0 ? est / freq : 0;
}

function ActivityRow({ activity, isToday, onLog }) {
  const isDuration = activity.planned_duration != null;
  const cpuf = useMemo(() => deriveCpuf(activity, isDuration), [activity, isDuration]);

  const [completedSets, setCompletedSets] = useState(0);
  const [completedReps, setCompletedReps] = useState(0);
  const [completedDuration, setCompletedDuration] = useState(0);
  const [logged, setLogged] = useState(false);
  const [logging, setLogging] = useState(false);
  const [error, setError] = useState("");

  const loggedKcal = useMemo(() => {
    if (!cpuf) return 0;
    const raw = isDuration
      ? cpuf * completedDuration
      : cpuf * completedReps * completedSets;
    return Math.round(raw * 10) / 10;
  }, [cpuf, isDuration, completedDuration, completedReps, completedSets]);

  const plannedLabel = isDuration
    ? formatDuration(activity.planned_duration)
    : `${activity.planned_sets ?? "—"} sets × ${activity.planned_reps ?? "—"} reps`;

  async function handleLog() {
    const hasData = isDuration ? completedDuration > 0 : (completedReps > 0 || completedSets > 0);
    if (!hasData) {
      setError("Enter at least one value.");
      return;
    }
    setLogging(true);
    setError("");
    try {
      await onLog({
        workout_plan_activity_id: activity.id,
        completed_reps: !isDuration ? completedReps || null : null,
        completed_sets: !isDuration ? completedSets || null : null,
        completed_duration: isDuration ? completedDuration || null : null,
        estimated_calories: loggedKcal || null,
      });
      setLogged(true);
    } catch (e) {
      setError(e?.message || "Failed to log.");
    } finally {
      setLogging(false);
    }
  }

  return (
    <div className="border border-white/5 rounded-xl bg-[#0A1020] p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-white">{activity.workout_name || "Exercise"}</span>
        {logged && <span className="text-xs text-green-400 font-semibold">Logged ✓</span>}
      </div>
      <p className="text-xs text-gray-500">
        Planned: {plannedLabel}
        {activity.intensity_value ? ` · ${activity.intensity_value} ${activity.intensity_measure || ""}` : ""}
      </p>
      {activity.estimated_calories != null && (
        <p className="text-xs text-gray-500">Est. {Number(activity.estimated_calories).toFixed(1)} kcal</p>
      )}

      {isToday && !logged && (
        <div className="space-y-1.5">
          {!isDuration ? (
            <div className="flex gap-1.5">
              <div className="flex-1">
                <p className="text-[10px] text-gray-500 mb-0.5">Sets</p>
                <input type="number" min={0} value={completedSets || ""}
                  onChange={(e) => { setCompletedSets(Number(e.target.value) || 0); setError(""); }}
                  className="w-full bg-[#080D19] border border-white/10 rounded px-2 py-1 text-sm text-white" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] text-gray-500 mb-0.5">Reps</p>
                <input type="number" min={0} value={completedReps || ""}
                  onChange={(e) => { setCompletedReps(Number(e.target.value) || 0); setError(""); }}
                  className="w-full bg-[#080D19] border border-white/10 rounded px-2 py-1 text-sm text-white" />
              </div>
            </div>
          ) : (
            <div>
              <p className="text-[10px] text-gray-500 mb-0.5">Duration completed</p>
              <HMSDuration value={completedDuration} onChange={(v) => { setCompletedDuration(v); setError(""); }} />
            </div>
          )}
          {loggedKcal > 0 && (
            <p className="text-xs text-blue-300">Calculated: {loggedKcal} kcal</p>
          )}
          {error ? <p className="text-xs text-red-300">{error}</p> : null}
          <button
            onClick={handleLog}
            disabled={logging}
            className="w-full py-1.5 text-xs rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium disabled:opacity-50"
          >
            {logging ? "Logging…" : "Log activity"}
          </button>
        </div>
      )}
    </div>
  );
}

export default function WorkoutPlanPopup({
  cwp,
  plan,
  occurrenceStart,
  occurrenceEnd,
  isToday,
  localDate,
  onDelete,
  onLog,
  onEdit,
  onClose,
}) {
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const activities = plan?.activities || [];

  async function handleDelete() {
    if (!onDelete) return;
    if (!window.confirm("Delete this scheduled workout plan?")) return;
    setDeleting(true);
    setDeleteError("");
    try {
      await onDelete();
    } catch (e) {
      setDeleteError(e?.message || "Failed to delete.");
      setDeleting(false);
    }
  }

  async function handleLogActivity(activityData) {
    if (!onLog) return;
    await onLog({ cwp_id: cwp.id, local_date: localDate, ...activityData });
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-[#0F1729] rounded-2xl border border-white/10 w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
        <div className="flex items-start justify-between p-5 border-b border-white/10 shrink-0">
          <div>
            <h3 className="text-lg font-bold text-white">{plan?.strata_name || "Workout Plan"}</h3>
            <p className="text-sm text-gray-400 mt-0.5">
              {fmtTime(occurrenceStart)} – {fmtTime(occurrenceEnd)}
            </p>
            {!isToday && onLog && (
              <p className="text-xs text-amber-400 mt-1">Completion logging only available on the scheduled day.</p>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none ml-4">×</button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {activities.length === 0 ? (
            <p className="text-gray-500 text-sm">No activities in this plan.</p>
          ) : (
            activities.map((activity) => (
              <ActivityRow
                key={activity.id}
                activity={activity}
                isToday={isToday && !!onLog}
                onLog={handleLogActivity}
              />
            ))
          )}
        </div>

        <div className="p-5 border-t border-white/10 space-y-2 shrink-0">
          {deleteError ? <p className="text-xs text-red-300">{deleteError}</p> : null}
          {onEdit && (
            <button
              onClick={onEdit}
              className="w-full py-2 text-sm border border-blue-500/30 text-blue-400 hover:bg-blue-500/10 rounded-xl"
            >
              Edit plan →
            </button>
          )}
          <div className="flex gap-2">
            {onDelete && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2 text-sm border border-red-500/30 text-red-400 hover:bg-red-500/10 rounded-xl disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Delete plan"}
              </button>
            )}
            <button
              onClick={onClose}
              className="flex-1 py-2 text-sm border border-white/10 text-gray-300 hover:bg-white/5 rounded-xl"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
